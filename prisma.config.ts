import { defineConfig } from "prisma/config";
import { getEnv } from "./src/env.js";

const env = getEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
