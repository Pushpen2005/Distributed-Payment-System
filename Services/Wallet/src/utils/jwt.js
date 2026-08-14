import jwt from "jsonwebtoken";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";



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
    

export {verifyAccessToken,verifyRefreshToken };