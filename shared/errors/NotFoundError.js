import AppError from "./AppError.js";

class NotFoundError extends AppError {
    constructor(message = "Not Found", code = null) {
        super(message, 404, code);
    }
}

export default NotFoundError;