import {
  getRedisManagerInstance,
  type RedisManager,
} from "@/libs/redis/RedisManager.js";
import { DateUtils, type timestamp } from "@/utils/date.js";

interface IdempotencyData<T> {
  data: T;
  timestamp: timestamp;
}

export class IdempotencyKeyManager {
  private redisManager: RedisManager | null = null;
  private readonly KEY_PREFIX = "idempotency:";
  private readonly DEFAULT_TTL = 900; // 15 minutes || 86400; // 24 hours

  private static instance: IdempotencyKeyManager | undefined;

  private async getRedisManager(): Promise<RedisManager> {
    if (!this.redisManager) {
      this.redisManager = await getRedisManagerInstance();
    }
    return this.redisManager;
  }

  private getKey(idempotencyKey: string): string {
    return `${this.KEY_PREFIX}${idempotencyKey}`;
  }

  async store<T>(
    idempotencyKey: string,
    data: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const redis = await this.getRedisManager();
    const key = this.getKey(idempotencyKey);
    const idemData: IdempotencyData<T> = {
      data: data,
      timestamp: DateUtils.now(),
    };

    await redis.setEx(key, ttl, JSON.stringify(idemData));
  }

  async retrieve<T>(
    idempotencyKey: string,
  ): Promise<IdempotencyData<T> | null> {
    const redis = await this.getRedisManager();
    const key = this.getKey(idempotencyKey);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as IdempotencyData<T>;
  }

  async exists(idempotencyKey: string): Promise<boolean> {
    const redis = await this.getRedisManager();
    const key = this.getKey(idempotencyKey);
    return await redis.exists(key);
  }

  async delete(idempotencyKey: string): Promise<void> {
    const redis = await this.getRedisManager();
    const key = this.getKey(idempotencyKey);
    await redis.del(key);
  }

  async clear(): Promise<void> {
    const redis = await this.getRedisManager();
    const pattern = `${this.KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    await redis.del(keys);
  }

  /**
   * Get singleton instance of IdempotencyKeyManager
   */
  static getInstance(): IdempotencyKeyManager {
    if (!IdempotencyKeyManager.instance) {
      IdempotencyKeyManager.instance = new IdempotencyKeyManager();
    }
    return IdempotencyKeyManager.instance;
  }
}
