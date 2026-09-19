import { ZodError } from "zod";
import ValidationError from "../../../../shared/errors/ValidationError.js";

const validate = (bodySchema, headersSchema) => (req, res, next) => {
    try {
        bodySchema?.parse(req.body);
        headersSchema?.parse(req.headers);

        next();
    }  catch (error) {
    if (error instanceof ZodError) {

        console.log("========== ZOD VALIDATION ERROR ==========");
        console.log(JSON.stringify(error.issues, null, 2));
        console.log("==========================================");

        const validationErrors = error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
        }));

        next(
            new ValidationError(
                "Validation failed",
                validationErrors
            )
        );
    } else {
        next(error);
    }
}
};

export default validate;