import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/UnauthorizedError.js";

const generateAccessToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
        }
    );
};

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );
    } catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
};

export { generateAccessToken, verifyAccessToken };