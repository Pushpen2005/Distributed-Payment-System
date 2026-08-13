import AppError from "./AppError.js";

class BadRequestError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

export default BadRequestError;