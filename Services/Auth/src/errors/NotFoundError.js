import AppError from "./AppError.js";

class NotFoundError extends APpError {
    constructor(message = "Not Found"){
        super(message, 404);
    }
}

export default NotFoundError;