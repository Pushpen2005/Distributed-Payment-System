import { ZodError } from "zod";
import ValidationError from "../errors/ValidationError.js";

const validate = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const validationErrors = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return next(
          new ValidationError(
            "Validation failed",
            validationErrors
          )
        );
      }

      return next(err);
    }
  };
};

export default validate;