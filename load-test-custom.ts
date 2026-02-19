import http from "http";

// Configuration from environment or defaults
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;
const HOST = "localhost";
const BASE_URL = `http://${HOST}:${PORT}`;
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || "60");
const TARGET_RPS = parseInt(process.env.TARGET_RPS || "10000");
const BATCH_INTERVAL = 100; // ms between batches

// Test data generators
const productIds: string[] = [
  "PROD-001",
  "PROD-002",
  "PROD-003",
  "PROD-004",
  "PROD-005",
];
const cardNumbers: string[] = [
  "4111111111111111", // Visa
  "5555555555554444", // Mastercard
  "378282246310005", // Amex
  "6011111111111117", // Discover
];

// Fake IP addresses for rotation (to bypass IP-based rate limiting)
const ipAddresses: string[] = [
  "192.168.1.1",
  "192.168.1.2",
  "192.168.1.3",
  "192.168.1.4",
  "10.0.0.1",
  "10.0.0.2",
  "172.16.0.1",
  "172.16.0.2",
];

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
const responseTimes: number[] = [];
const statusCodeCounts: Record<number, number> = {};

interface ErrorLog {
  timestamp: string;
  statusCode?: number;
  errorType: "network" | "timeout" | "http_error";
  message: string;
  responseBody?: string;
  duration?: number;
}

const errorLogs: ErrorLog[] = [];
const maxErrorLogsToKeep = 100; // Keep last 100 errors for memory efficiency

// Helper functions
function getRandomIP(): string {
  return ipAddresses[Math.floor(Math.random() * ipAddresses.length)];
}

function getRandomLoadTestId(): string {
  return loadTestIds[Math.floor(Math.random() * loadTestIds.length)];
}

function getRandomProduct(): string {
  return productIds[Math.floor(Math.random() * productIds.length)];
}

function getRandomCard(): string {
  return cardNumbers[Math.floor(Math.random() * cardNumbers.length)];
}

function getRandomEmail(): string {
  return `load-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`;
}

function getRandomName(): string {
  const firstNames: string[] = [
    "John",
    "Jane",
    "Bob",
    "Alice",
    "Charlie",
    "Diana",
  ];
  const lastNames: string[] = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
  ];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
    lastNames[Math.floor(Math.random() * lastNames.length)]
  }`;
}

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
): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    statusCode: statusCode ? parseInt(String(statusCode)) : undefined,
    errorType,
    message,
    responseBody: responseBody ? responseBody.substring(0, 200) : undefined,
    duration,
  };

  errorLogs.push(errorLog);

  // Keep only last N errors to avoid memory issues
  if (errorLogs.length > maxErrorLogsToKeep) {
    errorLogs.shift();
  }
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
  payment: {
    type: string;
    card: {
      number: string;
      holderName: string;
      cvv: string;
      expirationDate: string;
    };
  };
}

function makeRequest(): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const payload: RequestPayload = {
      product: {
        id: getRandomProduct(),
        price: Math.floor(Math.random() * 100 + 50), // Integer price between 50-150
      },
      customer: {
        name: getRandomName(),
        email: getRandomEmail(),
      },
      payment: {
        type: "CARD",
        card: {
          number: getRandomCard(),
          holderName: getRandomName().toUpperCase(), // Uppercase holder name
          cvv: String(Math.floor(Math.random() * 900) + 100), // 3-digit CVV as string
          expirationDate: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(
            new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
          ).slice(-2)}`,
        },
      },
    };

    const payloadString = JSON.stringify(payload);

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: "/order",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadString),
          "X-Forwarded-For": getRandomIP(), // Rotate fake IP
          "User-Agent": `LoadTest/${Math.random()}`,
        },
        timeout: 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const duration = Date.now() - startTime;
          responseTimes.push(duration);

          // Track status codes
          const statusCode = res.statusCode || 0;
          statusCodeCounts[statusCode] =
            (statusCodeCounts[statusCode] || 0) + 1;

          if (statusCode === 429) {
            rateLimitCount++;
          } else if (statusCode >= 200 && statusCode < 400) {
            successCount++;
          } else {
            errorCount++;
            // Log error details
            addErrorLog(
              statusCode,
              "http_error",
              `HTTP ${statusCode}`,
              data,
              duration,
            );
          }
          totalRequests++;
          resolve();
        });
      },
    );

    req.on("error", () => {
      const duration = Date.now() - startTime;
      networkErrorCount++;
      errorCount++;
      totalRequests++;
      addErrorLog(
        undefined,
        "network",
        "Network connection error",
        undefined,
        duration,
      );
      resolve();
    });

    req.on("timeout", () => {
      req.destroy();
      const duration = Date.now() - startTime;
      errorCount++;
      totalRequests++;
      addErrorLog(undefined, "timeout", "Request timeout", undefined, duration);
      resolve();
    });

    req.write(payloadString);
    req.end();
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
  log(
    "INFO",
    "Features: 50 unique load test identifiers, IP rotation, randomized parameters",
  );
  log("INFO", "");

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;
  let lastProgressLog = startTime;

  while (Date.now() < endTime) {
    const batchSize = Math.ceil(TARGET_RPS / (1000 / BATCH_INTERVAL));
    const promises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest());
    }

    await Promise.all(promises);

    // Sleep to maintain target RPS
    const elapsedInBatch = Date.now() - startTime;
    const expectedElapsed = (totalRequests / TARGET_RPS) * 1000;
    const sleepTime = Math.max(0, expectedElapsed - elapsedInBatch);

    if (sleepTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }

    // Print progress every 5 seconds
    const now = Date.now();
    if (now - lastProgressLog >= 5000) {
      const elapsed = ((now - startTime) / 1000).toFixed(1);
      const avgRps = (totalRequests / ((now - startTime) / 1000)).toFixed(0);
      const successRate = ((successCount / totalRequests) * 100).toFixed(1);
      log(
        "PROGRESS",
        `[${elapsed}s] ${totalRequests.toLocaleString()} requests | Success: ${successCount.toLocaleString()} (${successRate}%) | Errors: ${errorCount.toLocaleString()} | RateLimit: ${rateLimitCount.toLocaleString()} | Avg RPS: ${avgRps}`,
      );
      lastProgressLog = now;
    }
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
          // Show last 3 examples
          errors.slice(-3).forEach((err, idx) => {
            log(
              "DEBUG",
              `    Example ${idx + 1} @ ${err.timestamp}: ${err.message}${err.responseBody ? ` - ${err.responseBody}` : ""}`,
            );
          });
        });
    }

    if (errorsByType.network.length > 0) {
      console.log("");
      log("ERROR", `Network Errors: ${errorsByType.network.length} total`);
      errorsByType.network.slice(-3).forEach((err, idx) => {
        log("DEBUG", `  Example ${idx + 1} @ ${err.timestamp}: ${err.message}`);
      });
    }

    if (errorsByType.timeout.length > 0) {
      console.log("");
      log("ERROR", `Timeout Errors: ${errorsByType.timeout.length} total`);
      errorsByType.timeout.slice(-3).forEach((err, idx) => {
        log(
          "DEBUG",
          `  Example ${idx + 1} @ ${err.timestamp}: ${err.message} (${err.duration}ms)`,
        );
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
