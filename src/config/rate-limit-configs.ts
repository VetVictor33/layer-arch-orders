import type { RateLimitConfig } from "@/global/utils/rate-limiting/RateLimitingManager.js";

/**
 * Common rate limit configurations
 */

export const RATE_LIMIT_CONFIGS = {
  GLOBAL: {
    windowSizeSeconds: 10,
    maxRequests: 100,
  } as RateLimitConfig,

  SENSITIVE: {
    windowSizeSeconds: 1,
    maxRequests: 10,
  } as RateLimitConfig,
} as const;
