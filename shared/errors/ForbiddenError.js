import AppError from "./AppError.js"; 


class ForbiddenErrror extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }   
}

export default ForbiddenErrror;