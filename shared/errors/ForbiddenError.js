import AppError from "./AppError.js";

class ForbiddenError extends AppError {
    constructor(message = "Forbidden", code = null) {
        super(message, 403, code);
    }
}

export default ForbiddenError;