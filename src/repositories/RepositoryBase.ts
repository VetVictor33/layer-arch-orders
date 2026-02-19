import { getEnv } from "@/env.js";
import { PrismaClient } from "@/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

export interface IRepository<T> {
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
  disconnect(): Promise<void>;
}

export abstract class Repository<T> implements IRepository<T> {
  protected prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: getEnv().DATABASE_URL,
    });
    this.prisma = new PrismaClient({
      adapter,
    });
  }

  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract delete(id: string): Promise<void>;

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
