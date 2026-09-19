import jwt from "jsonwebtoken";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
        console.error("JWT verify failed:", err.name, "-", err.message);
        console.error("Secret loaded?", Boolean(process.env.JWT_ACCESS_SECRET));
        throw new UnauthorizedError("Invalid or expired token");
    }
};

export { verifyAccessToken };