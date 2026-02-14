import type { FastifyInstance } from "fastify";

export const healthRoutes = [
  async (server: FastifyInstance) => {
    server.get("/ping", async (request, reply) => {
      return { pong: "it worked!" };
    });
  },

  async (server: FastifyInstance) => {
    server.get("/health", async (request, reply) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    });
  },
];
