import http from "http";
import {
  getEmail,
  getRandomCard,
  getRandomElement,
  getRandomIP,
  getRandomName,
  maxRecentRequests,
  productIds,
  recentRequests,
  type Request,
} from "./utils.ts";

// Configuration from environment or defaults
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;
const HOST = "localhost";
const BASE_URL = `http://${HOST}:${PORT}`;
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || "30");
const TARGET_RPS = parseInt(process.env.TARGET_RPS || "100"); // Much more realistic default
const BATCH_INTERVAL = 100; // ms between batches
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "10000"); // 10 second timeout (realistic for loaded server)

// IP rotation is handled by `getRandomIP()` from tests/utils

// Generate unique load test identifiers
const loadTestIds: string[] = Array.from(
  { length: 50 },
  (_, i) => `load-test-${i + 1}`,
);

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let rateLimitCount = 0;
let networkErrorCount = 0;
let idempotencyHitCount = 0;
const responseTimes: number[] = [];
const statusCodeCounts: Record<number, number> = {};

// Reuse `recentRequests` and `maxRecentRequests` from tests/utils

interface ErrorLog {
  timestamp: string;
  statusCode?: number;
  errorType: "network" | "timeout" | "http_error";
  message: string;
  responseBody?: string;
  duration?: number;
  requestPayload?: {
    customerName: string;
    customerEmail: string;
    productId: string;
    price: number;
  };
  parsedResponse?: {
    error?: string;
    message?: string;
    stack?: string;
    [key: string]: unknown;
  };
}

const errorLogs: ErrorLog[] = [];
const maxErrorLogsToKeep = 100; // Keep last 100 errors for memory efficiency

// Helper functions
// getRandomIP, getRandomName, getEmail provided by tests/utils

function getCurrentTimestamp(): string {
  const now = new Date();
  return now.toISOString().split("T")[1].split(".")[0];
}

function log(level: string, message: string): void {
  const timestamp = getCurrentTimestamp();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function addErrorLog(
  statusCode: string | number | undefined,
  errorType: "network" | "timeout" | "http_error",
  message: string,
  responseBody?: string,
  duration?: number,
  requestPayload?: RequestPayload,
): void {
  let parsedResponse: ErrorLog["parsedResponse"] = undefined;

  if (responseBody) {
    try {
      parsedResponse = JSON.parse(responseBody) as ErrorLog["parsedResponse"];
    } catch {
      // Response body is not JSON, leave as undefined
    }
  }

  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    statusCode: statusCode ? parseInt(String(statusCode)) : undefined,
    errorType,
    message,
    responseBody: responseBody ? responseBody.substring(0, 500) : undefined,
    duration,
    requestPayload: requestPayload
      ? {
          customerName: requestPayload.customer.name,
          customerEmail: requestPayload.customer.email,
          productId: requestPayload.product.id,
          price: requestPayload.product.price,
        }
      : undefined,
    parsedResponse,
  };

  errorLogs.push(errorLog);

  // Keep only last N errors to avoid memory issues
  if (errorLogs.length > maxErrorLogsToKeep) {
    errorLogs.shift();
  }
}

function shouldTriggerIdempotency(): boolean {
  // 5% chance to retrigger a recent request for idempotency testing
  return Math.random() < 0.05 && recentRequests.length > 0;
}

function getIdempotencyRequestData(): Request | null {
  if (recentRequests.length === 0) return null;
  // Pick a random recent request
  return recentRequests[Math.floor(Math.random() * recentRequests.length)];
}

interface CardTokenPayload {
  number: string;
  holderName: string;
  cvv: string;
  expirationDate: string;
}

interface RequestPayload {
  product: {
    id: string;
    price: number;
  };
  customer: {
    name: string;
    email: string;
  };
  cardToken: string;
}

function tokenizeCard(
  cardData: CardTokenPayload,
  onComplete: (token: string | null) => void,
): void {
  const cardPayloadString = JSON.stringify(cardData);

  const req = http.request(
    {
      hostname: HOST,
      port: PORT,
      path: "/payment/card-token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(cardPayloadString),
        "X-Forwarded-For": getRandomIP(),
        "User-Agent": `LoadTest/${Math.random()}`,
      },
      timeout: REQUEST_TIMEOUT,
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const statusCode = res.statusCode || 0;

        if (statusCode >= 200 && statusCode < 300) {
          try {
            const response = JSON.parse(data);
            onComplete(response.token);
          } catch {
            onComplete(null);
          }
        } else {
          onComplete(null);
        }
      });
    },
  );

  req.on("error", () => {
    onComplete(null);
  });

  req.on("timeout", () => {
    req.destroy();
    onComplete(null);
  });

  req.write(cardPayloadString);
  req.end();
}

function makeRequest(): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isIdempotencyTest = false;
    let randomName: string;
    let productId: string;
    let price: number;

    // Check if we should trigger idempotency
    if (shouldTriggerIdempotency()) {
      const idemData = getIdempotencyRequestData();
      if (idemData) {
        isIdempotencyTest = true;
        randomName = idemData.name;
        productId = idemData.productId;
        price = idemData.price;
      } else {
        randomName = getRandomName();
        productId = getRandomElement(productIds);
        price = Math.floor(Math.random() * 100 + 50);
      }
    } else {
      randomName = getRandomName();
      productId = getRandomElement(productIds);
      price = Math.floor(Math.random() * 100 + 50);
    }

    const cardData: CardTokenPayload = {
      number: getRandomCard(),
      holderName: getRandomName().toUpperCase(),
      cvv: String(Math.floor(Math.random() * 900) + 100),
      expirationDate: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(
        new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
      ).slice(-2)}`,
    };

    // First: Tokenize the card
    tokenizeCard(cardData, (cardToken: string | null) => {
      if (!cardToken) {
        // Card tokenization failed, skip order creation
        errorCount++;
        totalRequests++;
        resolve();
        return;
      }

      // Second: Create order with tokenized card
      const orderPayload = {
        product: {
          id: productId,
          price,
        },
        customer: {
          name: randomName,
          email: getEmail(randomName),
        },
        cardToken,
      };

      const payloadString = JSON.stringify(orderPayload);

      const req = http.request(
        {
          hostname: HOST,
          port: PORT,
          path: "/order",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payloadString),
            "X-Forwarded-For": getRandomIP(),
            "User-Agent": `LoadTest/${Math.random()}`,
          },
          timeout: REQUEST_TIMEOUT,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            const duration = Date.now() - startTime;
            responseTimes.push(duration);

            const statusCode = res.statusCode || 0;
            statusCodeCounts[statusCode] =
              (statusCodeCounts[statusCode] || 0) + 1;

            // Log idempotency hit - same response suggests cache hit
            if (isIdempotencyTest && statusCode >= 200 && statusCode < 400) {
              idempotencyHitCount++;
            }

            if (statusCode === 429) {
              rateLimitCount++;
            } else if (statusCode >= 200 && statusCode < 400) {
              successCount++;
            } else {
              errorCount++;
              addErrorLog(
                statusCode,
                "http_error",
                `HTTP ${statusCode}`,
                data,
                duration,
                orderPayload,
              );
            }
            totalRequests++;
            resolve();
          });
        },
      );

      req.on("error", (err) => {
        const duration = Date.now() - startTime;
        networkErrorCount++;
        errorCount++;
        totalRequests++;
        addErrorLog(
          undefined,
          "network",
          `Network error: ${(err as Error).message || "Unknown"}`,
          undefined,
          duration,
          orderPayload,
        );
        resolve();
      });

      req.on("timeout", () => {
        req.destroy();
        const duration = Date.now() - startTime;
        errorCount++;
        totalRequests++;
        addErrorLog(
          undefined,
          "timeout",
          "Request timeout exceeded",
          undefined,
          duration,
          orderPayload,
        );
        resolve();
      });

      // Store request data for potential idempotency retests (shared array)
      if (!isIdempotencyTest) {
        recentRequests.push({
          name: randomName,
          email: getEmail(randomName),
          productId,
          price,
          timestamp: Date.now(),
        });

        if (recentRequests.length > maxRecentRequests) {
          recentRequests.shift();
        }
      }

      req.write(payloadString);
      req.end();
    });
  });
}

async function runLoadTest(): Promise<void> {
  log("INFO", "╔═══════════════════════════════════════════════════════╗");
  log("INFO", "║           LOAD TEST STARTING                          ║");
  log("INFO", "╚═══════════════════════════════════════════════════════╝");
  log("INFO", `Target URL: ${BASE_URL}`);
  log("INFO", `Target RPS: ${TARGET_RPS.toLocaleString()} requests/second`);
  log("INFO", `Duration: ${DURATION_SECONDS} seconds`);
  log(
    "INFO",
    `Expected Total Requests: ${(TARGET_RPS * DURATION_SECONDS).toLocaleString()}`,
  );
  log("INFO", `Request Timeout: ${REQUEST_TIMEOUT}ms`);
  log(
    "INFO",
    "Features: 50 unique load test identifiers, IP rotation, randomized parameters",
  );
  log(
    "INFO",
    "Idempotency Testing: ~5% of requests will retry recent orders (same customer + product + price)",
  );
  log("INFO", "");
  log("INFO", "💡 Pro Tips:");
  log(
    "INFO",
    `   - For light testing: TARGET_RPS=50 DURATION_SECONDS=30 REQUEST_TIMEOUT=15000 pnpm test:load`,
  );
  log(
    "INFO",
    `   - For moderate testing: TARGET_RPS=200 DURATION_SECONDS=60 REQUEST_TIMEOUT=15000 pnpm test:load`,
  );
  log(
    "INFO",
    `   - For heavy testing: TARGET_RPS=1000 DURATION_SECONDS=60 REQUEST_TIMEOUT=30000 pnpm test:load`,
  );
  log(
    "INFO",
    `   - For insane testing: TARGET_RPS=1500 DURATION_SECONDS=120 REQUEST_TIMEOUT=60000 pnpm test:load:insane`,
  );
  log(
    "INFO",
    `   ⚠️  Single Node.js client is limited to ~1500 RPS max (OS socket limits)`,
  );
  log("INFO", "");

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;
  let lastProgressLog = startTime;
  let sentRequests = 0;

  // Send requests asynchronously without waiting for responses
  const sendRequestsAsync = async () => {
    while (Date.now() < endTime) {
      const batchSize = Math.ceil(TARGET_RPS / (1000 / BATCH_INTERVAL));

      // Send all requests in batch without waiting for them to complete
      for (let i = 0; i < batchSize; i++) {
        makeRequest(); // Fire and forget - don't await
        sentRequests++;
      }

      // Sleep for BATCH_INTERVAL to maintain target RPS
      await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL));
    }
  };

  // Start sending requests
  sendRequestsAsync();

  // Report progress while requests are being processed
  while (Date.now() < endTime) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const now = Date.now();
    const elapsed = ((now - startTime) / 1000).toFixed(1);
    const avgRps = (totalRequests / ((now - startTime) / 1000)).toFixed(0);
    const successRate =
      totalRequests > 0
        ? ((successCount / totalRequests) * 100).toFixed(1)
        : "0.0";
    log(
      "PROGRESS",
      `[${elapsed}s] ${totalRequests.toLocaleString()} requests | Success: ${successCount.toLocaleString()} (${successRate}%) | Errors: ${errorCount.toLocaleString()} | RateLimit: ${rateLimitCount.toLocaleString()} | Avg RPS: ${avgRps}`,
    );
  }

  // Wait for remaining requests to complete (up to 30 seconds)
  const flushStart = Date.now();
  while (totalRequests < sentRequests && Date.now() - flushStart < 30000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Print final results
  console.log("");
  log("INFO", "╔═══════════════════════════════════════════════════════╗");
  log("INFO", "║              LOAD TEST RESULTS                        ║");
  log("INFO", "╚═══════════════════════════════════════════════════════╝");

  const successRate = ((successCount / totalRequests) * 100).toFixed(2);
  const errorRate = ((errorCount / totalRequests) * 100).toFixed(2);
  const rateLimitRate = ((rateLimitCount / totalRequests) * 100).toFixed(2);

  log("RESULT", `Total Requests: ${totalRequests.toLocaleString()}`);
  log(
    "RESULT",
    `✓ Successful: ${successCount.toLocaleString()} (${successRate}%)`,
  );
  log("RESULT", `✗ Errors: ${errorCount.toLocaleString()} (${errorRate}%)`);
  log(
    "RESULT",
    `⚠ Rate Limited (429): ${rateLimitCount.toLocaleString()} (${rateLimitRate}%)`,
  );
  if (networkErrorCount > 0) {
    log(
      "RESULT",
      `🔴 Network/Timeout Errors: ${networkErrorCount.toLocaleString()}`,
    );
  }
  if (idempotencyHitCount > 0) {
    log(
      "RESULT",
      `🔄 Idempotency Tests Triggered: ${idempotencyHitCount.toLocaleString()}`,
    );
  }

  // Status code breakdown
  console.log("");
  log("INFO", "Status Code Distribution:");
  Object.entries(statusCodeCounts)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .forEach(([code, count]) => {
      const percentage = ((count / totalRequests) * 100).toFixed(1);
      log("STAT", `  ${code}: ${count.toLocaleString()} (${percentage}%)`);
    });

  // Error summary
  if (errorLogs.length > 0) {
    console.log("");
    log("INFO", "Error Summary (Last ~100 errors):");

    // Group errors by type
    const errorsByType: Record<string, ErrorLog[]> = {
      http_error: [],
      network: [],
      timeout: [],
    };

    errorLogs.forEach((err) => {
      errorsByType[err.errorType].push(err);
    });

    // Group HTTP errors by status code
    if (errorsByType.http_error.length > 0) {
      console.log("");
      log("INFO", "HTTP Errors:");
      const httpErrorsByCode: Record<number, ErrorLog[]> = {};
      errorsByType.http_error.forEach((err) => {
        const code = err.statusCode || 0;
        if (!httpErrorsByCode[code]) {
          httpErrorsByCode[code] = [];
        }
        httpErrorsByCode[code].push(err);
      });

      Object.entries(httpErrorsByCode)
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .forEach(([code, errors]) => {
          log("ERROR", `  Status ${code}: ${errors.length} occurrences`);
          // Show last 3 examples with full details
          errors.slice(-3).forEach((err, idx) => {
            log("DEBUG", `    Example ${idx + 1} @ ${err.timestamp}`);
            if (err.requestPayload) {
              log(
                "DEBUG",
                `      Request: Customer="${err.requestPayload.customerName}" (${err.requestPayload.customerEmail}), Product=${err.requestPayload.productId}, Price=${err.requestPayload.price}`,
              );
            }
            log("DEBUG", `      Response: ${err.message}`);
            if (err.parsedResponse?.error || err.parsedResponse?.message) {
              const errorMsg =
                err.parsedResponse.error || err.parsedResponse.message;
              log("DEBUG", `      Error Details: ${errorMsg}`);
            }
            if (err.responseBody && !err.parsedResponse) {
              log("DEBUG", `      Body: ${err.responseBody}`);
            }
            if (err.duration) {
              log("DEBUG", `      Duration: ${err.duration}ms`);
            }
          });
        });
    }

    if (errorsByType.network.length > 0) {
      console.log("");
      log("ERROR", `Network Errors: ${errorsByType.network.length} total`);
      errorsByType.network.slice(-5).forEach((err, idx) => {
        log("DEBUG", `  Example ${idx + 1} @ ${err.timestamp}`);
        log("DEBUG", `    Error: ${err.message}`);
        if (err.requestPayload) {
          log(
            "DEBUG",
            `    Request: Customer="${err.requestPayload.customerName}" (${err.requestPayload.customerEmail}), Product=${err.requestPayload.productId}, Price=${err.requestPayload.price}`,
          );
        }
        log("DEBUG", `    Duration: ${err.duration}ms`);
      });
    }

    if (errorsByType.timeout.length > 0) {
      console.log("");
      log("ERROR", `Timeout Errors: ${errorsByType.timeout.length} total`);
      errorsByType.timeout.slice(-5).forEach((err, idx) => {
        log("DEBUG", `  Example ${idx + 1} @ ${err.timestamp}: ${err.message}`);
        if (err.requestPayload) {
          log(
            "DEBUG",
            `    Request: Customer="${err.requestPayload.customerName}" (${err.requestPayload.customerEmail}), Product=${err.requestPayload.productId}, Price=${err.requestPayload.price}`,
          );
        }
        log("DEBUG", `    Duration: ${err.duration}ms`);
      });
    }
  }

  // Response time stats
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const avg = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p90 = responseTimes[Math.floor(responseTimes.length * 0.9)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    console.log("");
    log("INFO", "Response Time Statistics (ms):");
    log("PERF", `  Min: ${min}`);
    log("PERF", `  Avg: ${avg.toFixed(2)}`);
    log("PERF", `  P50: ${p50}`);
    log("PERF", `  P90: ${p90}`);
    log("PERF", `  P95: ${p95}`);
    log("PERF", `  P99: ${p99}`);
    log("PERF", `  Max: ${max}`);
  }

  console.log("");
  log("INFO", "╔═══════════════════════════════════════════════════════╗");
  log("INFO", "║              LOAD TEST COMPLETE                       ║");
  log("INFO", "╚═══════════════════════════════════════════════════════╝");
}

runLoadTest().catch((err: Error) => {
  log("ERROR", `Fatal error: ${err.message}`);
  process.exit(1);
});
