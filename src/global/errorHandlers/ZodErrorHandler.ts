import { ZodError } from "zod";
import z from "zod";
import { ErrorHandlerBase, type ErrorResponse } from "./ErrorHandlerBase.js";
import { DateUtils } from "@/global/utils/date.js";

export class ZodErrorHandler extends ErrorHandlerBase {
  canHandle(error: Error): boolean {
    return error instanceof ZodError;
  }

  handle(error: Error): ErrorResponse {
    const zodError = error as ZodError;
    const errorMap = z.treeifyError(zodError);

    return {
      statusCode: 400,
      message: "Validation error",
      errors: errorMap,
      timestamp: DateUtils.toUtcDate(DateUtils.now()),
    };
  }
}
