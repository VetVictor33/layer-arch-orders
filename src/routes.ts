import type { FastifyInstance } from "fastify";
import { allRoutes } from "@/controllers/index.js";

export const registerRoutes = async (server: FastifyInstance) => {
  for (const routes of allRoutes) {
    for (const route of routes) {
      await route(server);
    }
  }
};
