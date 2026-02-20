import type { FastifyInstance } from "fastify";
import { DateUtils } from "@/global/utils/date.js";
import { ROUTES } from "@/config/routes-paths.js";

export const healthRoutes = [
  async (server: FastifyInstance) => {
    server.get(ROUTES.HEALTH.ROOT, async (request, reply) => {
      return {
        status: "ok",
        timestamp: DateUtils.toUtcDate(DateUtils.now()),
      };
    });
  },
];
