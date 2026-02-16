import type { FastifyInstance } from "fastify";

export const healthRoutes = [
  async (server: FastifyInstance) => {
    server.get("/", async (request, reply) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    });
  },
];
