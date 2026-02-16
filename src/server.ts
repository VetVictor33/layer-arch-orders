import Fastify, { type FastifyInstance } from "fastify";
import { getEnv } from "@/env.js";
import { registerRoutes } from "@/routes.js";
import { registerErrorHandler } from "@/middleware/errorHandler.js";
import { LOGGER_CONFIG } from "@/libs/logger.js";

const env = getEnv();

const server: FastifyInstance = Fastify({
  logger: LOGGER_CONFIG,
  disableRequestLogging: true,
});

registerErrorHandler(server);
await registerRoutes(server);

const start = async () => {
  try {
    await server.listen({ port: env.PORT, host: "0.0.0.0" });

    const address = server.server.address();
    const port = typeof address === "string" ? address : address?.port;

    server.log.info(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
