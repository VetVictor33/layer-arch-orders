import pino from "pino";
import { getEnv } from "@/env.js";

const env = getEnv();

export const LOGGER_CONFIG = {
  level: env.LOG_LEVEL,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
};

export const logger = pino(LOGGER_CONFIG);
