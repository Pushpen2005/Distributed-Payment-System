import jwt from "jsonwebtoken";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";

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

const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        }
    );
};

const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }
};
    

export { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken };