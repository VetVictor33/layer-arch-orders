import { getEnv } from "@/env.js";
import { ErrorHandlerBase, type ErrorResponse } from "./ErrorHandlerBase.js";
import { DateUtils } from "@/global/utils/date.js";

export class PrismaErrorHandler extends ErrorHandlerBase {
  canHandle(error: Error): boolean {
    return error.name === "PrismaClientKnownRequestError";
  }

  handle(error: Error): ErrorResponse {
    const prismaError = error as any;
    let message = "Database error";
    let statusCode = 500;

    if (prismaError.code === "P2002") {
      message = "Unique constraint violation";
      statusCode = 409;
    } else if (prismaError.code === "P2025") {
      message = "Resource not found";
      statusCode = 404;
    }

    if (getEnv().NODE_ENV === "production") {
      message = "Database error";
      statusCode = 400;
    }

    return {
      statusCode,
      message,
      timestamp: DateUtils.toUtcDate(DateUtils.now()),
    };
  }
}
