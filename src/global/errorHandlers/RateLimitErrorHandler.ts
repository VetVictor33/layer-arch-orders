import type { FastifyRequest, FastifyReply } from "fastify";
import { RateLimitExceededError } from "@/global/errors/RateLimitError.js";
import { ErrorHandlerBase } from "@/global/errorHandlers/ErrorHandlerBase.js";
import { DateUtils } from "@/utils/date.js";

export class RateLimitErrorHandler extends ErrorHandlerBase {
  canHandle(error: Error): boolean {
    return error instanceof RateLimitExceededError;
  }

  handle(error: RateLimitExceededError) {
    return {
      statusCode: 429,
      message: "Too many requests",
      remaining: error.remaining,
      resetAt: error.resetAt,
      retryAfter: DateUtils.toUtcDate(error.resetAt),
      timestamp: DateUtils.toUtcDate(DateUtils.now()),
    };
  }
}
