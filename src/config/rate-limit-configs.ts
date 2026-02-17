import type { RateLimitConfig } from "@/utils/rate-limiting/RateLimitingManager.js";

/**
 * Common rate limit configurations
 */

export const RATE_LIMIT_CONFIGS = {
  GLOBAL: {
    windowSizeSeconds: 120,
    maxRequests: 10,
  } as RateLimitConfig,

  SENSITIVE: {
    windowSizeSeconds: 1,
    maxRequests: 10,
  } as RateLimitConfig,
} as const;
