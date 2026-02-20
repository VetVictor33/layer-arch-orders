import {
  getRedisManagerInstance,
  type RedisManager,
} from "@/libs/redis/RedisManager.js";
import { DateUtils, type timestamp } from "@/global/utils/date.js";

export interface RateLimitConfig {
  windowSizeSeconds: number;
  maxRequests: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: timestamp;
  isLimited: boolean;
}

export class RateLimitingManager {
  private redisManager: RedisManager | null = null;
  private readonly KEY_PREFIX = "ratelimit:";

  private async getRedisManager(): Promise<RedisManager> {
    if (!this.redisManager) {
      this.redisManager = await getRedisManagerInstance();
    }
    return this.redisManager;
  }

  private getKey(identifier: string): string {
    return `${this.KEY_PREFIX}${identifier}`;
  }

  /**
   * Check and increment rate limit counter
   * @param identifier - Unique identifier (e.g., user ID, IP address, API key)
   * @param config - Rate limit configuration
   * @returns Rate limit info including remaining requests and reset time
   */
  async checkAndIncrement(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const redis = await this.getRedisManager();
    const key = this.getKey(identifier);

    const current = await redis.incr(key);

    // Set TTL on first request
    if (current === 1) {
      await redis.expire(key, config.windowSizeSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetAt = DateUtils.addSeconds(DateUtils.now(), ttl);
    const isLimited = current > config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - current);

    return {
      remaining,
      resetAt,
      isLimited,
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const redis = await this.getRedisManager();
    const key = this.getKey(identifier);

    const exists = await redis.exists(key);
    if (!exists) {
      return {
        remaining: config.maxRequests,
        resetAt: DateUtils.addSeconds(
          DateUtils.now(),
          config.windowSizeSeconds,
        ),
        isLimited: false,
      };
    }

    const current = await redis.get(key);
    const currentCount = current ? parseInt(current, 10) : 0;
    const ttl = await redis.ttl(key);
    const resetAt = DateUtils.addSeconds(DateUtils.now(), ttl);
    const isLimited = currentCount >= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    return {
      remaining,
      resetAt,
      isLimited,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier: string): Promise<void> {
    const redis = await this.getRedisManager();
    const key = this.getKey(identifier);
    await redis.del(key);
  }

  /**
   * Clear all rate limit entries
   */
  async clearAll(): Promise<void> {
    const redis = await this.getRedisManager();
    const pattern = `${this.KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    await redis.del(keys);
  }
}

let instance: RateLimitingManager | undefined;

export async function getRateLimitingManagerInstance(): Promise<RateLimitingManager> {
  if (!instance) {
    instance = new RateLimitingManager();
  }
  return instance;
}
