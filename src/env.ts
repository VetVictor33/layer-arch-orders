import { z } from "zod";
import "dotenv/config";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
  SILENT = "silent",
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.WARN),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

const validateEnv = (): Env => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
  }

  return parsed.data;
};

export const getEnv = (): Env => {
  if (!env) {
    env = validateEnv();
  }
  return env;
};
