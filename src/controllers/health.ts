import type { FastifyInstance } from "fastify";
import { DateUtils } from "@/utils/date.js";

export const healthRoutes = [
  async (server: FastifyInstance) => {
    server.get("/", async (request, reply) => {
      return {
        status: "ok",
        timestamp: DateUtils.toUtcDate(DateUtils.now()),
      };
    });
  },
];
