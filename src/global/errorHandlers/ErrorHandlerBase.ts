import type { FastifyReply, FastifyRequest } from "fastify";

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

export abstract class ErrorHandlerBase {
  abstract canHandle(error: Error): boolean;
  abstract handle(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): ErrorResponse;
}
