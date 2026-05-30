import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiResponse } from "../types/index.js";

/**
 * Generic Zod validation middleware factory.
 *
 * @param schema  - A Zod schema to validate against
 * @param source  - Which part of the request to validate (defaults to "body")
 *
 * @example
 * router.post("/upload", validate(ContractZodSchema), controller.upload);
 */
export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues;
      const fieldErrors = issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      const response: ApiResponse<null> = {
        success: false,
        error: "Validation failed",
        message: fieldErrors.map((e) => `${e.field}: ${e.message}`).join("; "),
      };

      res.status(400).json(response);
      return;
    }

    // Attach validated data back to the request so controllers get clean data
    req[source] = result.data;
    next();
  };
};
