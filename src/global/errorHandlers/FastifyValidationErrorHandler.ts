import { ErrorHandlerBase, type ErrorResponse } from "./ErrorHandlerBase.js";
import { DateUtils } from "@/utils/date.js";

export class FastifyValidationErrorHandler extends ErrorHandlerBase {
  canHandle(error: Error): boolean {
    return error.name === "FST_ERR_VALIDATION";
  }

  handle(): ErrorResponse {
    return {
      statusCode: 400,
      message: "Request validation failed",
      timestamp: DateUtils.toUtcDate(DateUtils.now()),
    };
  }
}
