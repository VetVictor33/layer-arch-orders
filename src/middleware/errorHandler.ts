import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodErrorHandler } from "@/global/errorHandlers/ZodErrorHandler.js";
import { PrismaErrorHandler } from "@/global/errorHandlers/PrismaErrorHandler.js";
import { FastifyValidationErrorHandler } from "@/global/errorHandlers/FastifyValidationErrorHandler.js";
import { RateLimitErrorHandler } from "@/global/errorHandlers/RateLimitErrorHandler.js";
import { GenericErrorHandler } from "@/global/errorHandlers/GenericErrorHandler.js";
import type { ErrorHandlerBase } from "@/global/errorHandlers/ErrorHandlerBase.js";
import { DateUtils } from "@/utils/date.js";

export const registerErrorHandler = (server: FastifyInstance) => {
  const errorHandlers: ErrorHandlerBase[] = [
    new RateLimitErrorHandler(),
    new ZodErrorHandler(),
    new PrismaErrorHandler(),
    new FastifyValidationErrorHandler(),
    new GenericErrorHandler(),
  ];

  server.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const handler = errorHandlers.find((h) => h.canHandle(error));

      if (!handler) {
        reply.code(500).send({
          statusCode: 500,
          message: "Internal server error",
          timestamp: DateUtils.toUtcDate(DateUtils.now()),
        });
        return;
      }

      const errorResponse = handler.handle(error, request, reply);

      server.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        statusCode: errorResponse.statusCode,
      });

      return reply.code(errorResponse.statusCode).send(errorResponse);
    },
  );
};
