import AppError from "./AppError.js";

class BadRequestError extends AppError {
    constructor(message, code = null) {
        super(message, 400, code);
    }
}

export default BadRequestError;