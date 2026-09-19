
import { verifyAccessToken } from "../utils/jwt.js";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";

const paymentMiddleware = (req, res, next) => {
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(
            new UnauthorizedError("Access token is missing")
        );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return next(
            new UnauthorizedError("Access token is missing")
        );
    }

    try {
        const decoded = verifyAccessToken(token);

        req.user = decoded;

        next();
    } catch (err) {
        next(err);
    }
};

export default paymentMiddleware;