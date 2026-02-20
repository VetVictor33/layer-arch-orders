import { getEnv } from "@/env.js";
import { AppError } from "@/global/errors/AppError.js";
import { ErrorHandlerBase, type ErrorResponse } from "./ErrorHandlerBase.js";
import { DateUtils } from "@/global/utils/date.js";

export class GenericErrorHandler extends ErrorHandlerBase {
  canHandle(): boolean {
    return true; // Always handles as fallback
  }

  handle(error: Error): ErrorResponse {
    const isProduction = getEnv().NODE_ENV === "production";
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const message = isAppError
      ? error.message
      : isProduction
        ? "Internal server error"
        : error.message || "Internal server error";

    return {
      statusCode,
      message,
      timestamp: DateUtils.toUtcDate(DateUtils.now()),
    };
  }
}
