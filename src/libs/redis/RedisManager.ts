import { getEnv } from "@/env.js";
import { LOGGER } from "@/libs/logger.js";
import { createClient, type RedisClientType } from "redis";

export class RedisManager {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: getEnv().REDIS_URL,
      password: getEnv().REDIS_PASSWORD,
    });

    this.client.on("error", (err) => {
      LOGGER.error("Redis Client Error", err);
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setEx(key: string, ttl: number, value: string): Promise<void> {
    await this.client.setEx(key, ttl, value);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      if (key.length > 0) {
        await this.client.del(key);
      }
    } else {
      await this.client.del(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    return (await this.client.expire(key, ttl)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

let instance: RedisManager | undefined;

export async function getRedisManagerInstance(): Promise<RedisManager> {
  if (!instance) {
    instance = new RedisManager();
    await instance.connect();
  }
  return instance;
}
