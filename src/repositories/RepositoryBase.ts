import { getEnv } from "@/env.js";
import { PrismaClient } from "@/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

export abstract class RepositoryBase<T> {
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
