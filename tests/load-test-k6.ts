import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const successCount = new Counter("success_count");
const errorCount = new Counter("error_count");
const rateLimitedCount = new Counter("rate_limited_count");
const p95ResponseTime = new Trend("p95_response_time");
const idempotencyHits = new Counter("idempotency_hits");
const requestCount = new Counter("request_count");

// Rate metrics: track if each request was success/error (for threshold calculations)
// Note: 429s are excluded from error rate since they're rate limiting, not app errors
const errorRate = new Rate("error_rate");
const successRate = new Rate("success_rate");
const idempotencyHitRate = new Rate("idempotency_hit_rate");
const rateLimitedRate = new Rate("rate_limited_rate");

// Test data
const productIds = ["PROD-001", "PROD-002", "PROD-003", "PROD-004", "PROD-005"];
const firstNames = ["John", "Jane", "Bob", "Alice", "Charlie", "Diana"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"];
const cardNumbers = [
  "4111111111111111",
  "5555555555554444",
  "378282246310005",
  "6011111111111117",
];

// IP addresses for rotation (bypass IP-based rate limiting)
const MAX_IP_SUFFIX = 3; // Maximum number to replace X with
const ipAddresses = ["192.168.1.X", "10.0.0.X", "172.16.0.X", "203.0.113.X"];

// Store recent requests for idempotency testing
interface RecentRequest {
  name: string;
  productId: string;
  price: number;
}

const recentRequests: RecentRequest[] = [];
const maxRecentRequests = 20;

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomIP(): string {
  const ipPattern = getRandomElement(ipAddresses);
  const randomSuffix = Math.ceil(Math.random() * MAX_IP_SUFFIX);
  return ipPattern.replace("X", randomSuffix.toString());
}

function getRandomName(): string {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function getEmail(name: string): string {
  return `${name.replace(/\s/g, "")}@example.com`;
}

interface OrderPayload {
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

function generateOrderPayload(useRecent = false): OrderPayload {
  let name: string;
  let productId: string;
  let price: number;

  if (useRecent && recentRequests.length > 0) {
    const recent =
      recentRequests[Math.floor(Math.random() * recentRequests.length)];
    name = recent.name;
    productId = recent.productId;
    price = recent.price;
  } else {
    name = getRandomName();
    productId = getRandomElement(productIds);
    price = Math.floor(Math.random() * 1000) + 500;
  }

  const payload: OrderPayload = {
    product: {
      id: productId,
      price,
    },
    customer: {
      name,
      email: getEmail(name),
    },
    payment: {
      type: "CARD",
      card: {
        number: getRandomElement(cardNumbers),
        holderName: getRandomName().toUpperCase(),
        cvv: String(Math.floor(Math.random() * 900) + 100),
        expirationDate: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(
          new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
        ).slice(-2)}`,
      },
    },
  };

  // Store for potential idempotency testing
  if (!useRecent) {
    recentRequests.push({ name, productId, price });
    if (recentRequests.length > maxRecentRequests) {
      recentRequests.shift();
    }
  }

  return payload;
}

interface Stage {
  duration: string;
  target: number;
}

interface Thresholds {
  success_rate: string[];
  error_rate: string[];
  p95_response_time: string[];
  rate_limited_rate: string[];
}

interface Options {
  stages: Stage[];
  thresholds: Thresholds;
}

export const options: Options = {
  stages: [
    { duration: "10s", target: 50 }, // Ramp up to 50 users over 10s
    { duration: "30s", target: 100 }, // Ramp up to 100 users over 30s
    { duration: "1m", target: 500 }, // Ramp up to 500 users over 1m
    { duration: "2m", target: 500 }, // Stay at 500 users for 2m
    { duration: "30s", target: 0 }, // Ramp down to 0 users over 30s
  ],
  thresholds: {
    success_rate: ["rate>0.95"],
    rate_limited_rate: ["rate<0.90"], // Rate limited requests should be < 90% under normal load
    error_rate: ["rate<0.05"],
    p95_response_time: ["p(95)<5000"], // P95 response time below 5s
  },
};

export default function (): void {
  // 95% normal requests, 5% idempotency tests
  const useRecent = Math.random() < 0.05 && recentRequests.length > 0;
  const payload = generateOrderPayload(useRecent);

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": getRandomIP(),
    },
    timeout: "60s",
  };

  group("Create Order", () => {
    const res = http.post(
      "http://localhost:3333/order",
      JSON.stringify(payload),
      params,
    );

    requestCount.add(1);
    p95ResponseTime.add(res.timings.duration);

    const is200s = res.status >= 200 && res.status < 300;
    const isRateLimited = res.status === 429;
    const isSuccess = is200s || isRateLimited;
    const isIdempotencyTest = useRecent;

    check(res, {
      "status is 200-299 or 429": () => isSuccess,
      "status is not 500": () => res.status !== 500,
      "response time < 5s": () => res.timings.duration < 5000,
    });

    successRate.add(isSuccess);
    errorRate.add(!isSuccess);
    idempotencyHitRate.add(isIdempotencyTest);
    rateLimitedRate.add(isRateLimited);

    if (isSuccess) {
      successCount.add(1);
      if (isIdempotencyTest) {
        idempotencyHits.add(1);
      }
      if (isRateLimited) {
        rateLimitedCount.add(1);
      }
    } else {
      errorCount.add(1);
    }
  });

  // Random sleep between 0.1s and 0.5s
  sleep(Math.random() * 0.4 + 0.1);
}
