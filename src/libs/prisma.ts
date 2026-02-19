import { getEnv } from "@/env.js";
import { PrismaClient } from "@/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

let prismaInstance: PrismaClient | null = null;

export function getPrismaInstance(): PrismaClient {
  if (!prismaInstance) {
    const adapter = new PrismaPg({
      connectionString: getEnv().DATABASE_URL,
    });
    prismaInstance = new PrismaClient({
      adapter,
    });
  }
  return prismaInstance;
}
