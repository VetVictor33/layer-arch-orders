import { PrismaClient } from "@/generated/prisma/client.js";
import { getPrismaInstance } from "@/libs/prisma.js";

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
    this.prisma = getPrismaInstance();
  }

  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract delete(id: string): Promise<void>;

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
