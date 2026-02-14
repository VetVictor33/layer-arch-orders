import type { FastifyInstance, RouteShorthandOptions } from "fastify";

const healthCheckOptions: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          status: {
            type: "string",
          },
          timestamp: {
            type: "string",
          },
        },
      },
    },
  },
};

export const healthRoutes = [
  async (server: FastifyInstance) => {
    server.get("/ping", healthCheckOptions, async (request, reply) => {
      return { pong: "it worked!" };
    });
  },

  async (server: FastifyInstance) => {
    server.get("/health", healthCheckOptions, async (request, reply) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
    });
  },
];
