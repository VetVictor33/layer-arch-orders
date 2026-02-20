import { check, group, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import {
  getEmail,
  getRandomCard,
  getRandomElement,
  getRandomIP,
  getRandomName,
  maxRecentRequests,
  OrderPayload,
  productIds,
  recentRequests,
} from "./utils.ts";

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

// Test data and helpers imported from ./utils.ts

interface CardTokenPayload {
  number: string;
  holderName: string;
  cvv: string;
  expirationDate: string;
}

function generateCardData(): CardTokenPayload {
  return {
    number: getRandomCard(),
    holderName: getRandomName().toUpperCase(),
    cvv: String(Math.floor(Math.random() * 900) + 100),
    expirationDate: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}/${String(
      new Date().getFullYear() + Math.floor(Math.random() * 5) + 1,
    ).slice(-2)}`,
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
      card: generateCardData(),
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
  const cardData = generateCardData();
  const orderPayload = generateOrderPayload(useRecent);

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": getRandomIP(),
    },
    timeout: "60s",
  };

  let cardToken = "";

  // Step 1: Tokenize card
  group("Tokenize Card", () => {
    const res = http.post(
      "http://localhost:3333/payment/card-token",
      JSON.stringify(cardData),
      params,
    );

    requestCount.add(1);
    p95ResponseTime.add(res.timings.duration);

    const is200s = res.status >= 200 && res.status < 300;
    const isSuccess = is200s;

    check(res, {
      "tokenization status is 2xx": () => is200s,
      "tokenization response time < 2s": () => res.timings.duration < 2000,
    });

    successRate.add(isSuccess);
    errorRate.add(!isSuccess);

    if (isSuccess) {
      successCount.add(1);
      const responseBody = JSON.parse(String(res.body));
      cardToken = responseBody.token;
    } else {
      errorCount.add(1);
    }
  });

  // Step 2: Create order with tokenized card
  group("Create Order", () => {
    if (!cardToken) {
      // Skip order creation if tokenization failed
      return;
    }

    const orderPayloadWithToken = {
      ...orderPayload,
      cardToken,
    };
    // Remove card data from payload since we have the token
    orderPayloadWithToken.payment = undefined!;

    const res = http.post(
      "http://localhost:3333/order",
      JSON.stringify(orderPayloadWithToken),
      params,
    );

    requestCount.add(1);
    p95ResponseTime.add(res.timings.duration);

    const is200s = res.status >= 200 && res.status < 300;
    const isRateLimited = res.status === 429;
    const isSuccess = is200s || isRateLimited;

    check(res, {
      "order status is 200-299 or 429": () => isSuccess,
      "order status is not 500": () => res.status !== 500,
      "order response time < 5s": () => res.timings.duration < 5000,
    });

    successRate.add(isSuccess);
    errorRate.add(!isSuccess);
    rateLimitedRate.add(isRateLimited);

    if (isSuccess) {
      successCount.add(1);
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
