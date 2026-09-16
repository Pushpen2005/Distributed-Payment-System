import { verifyAccessToken } from "../utils/jwt.js";
import UnauthorizedError from "../../../../shared/errors/UnauthorizedError.js";

const walletMiddleware = (req, res, next) => {
    console.log("WALLET AUTH HEADER:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("NO AUTH HEADER");
        return next(
            new UnauthorizedError("Access token is missing")
        );
    }

    const token = authHeader.split(" ")[1];

    console.log("TOKEN RECEIVED:", !!token);

    try {
        const decoded = verifyAccessToken(token);

        console.log("TOKEN VERIFIED:", decoded);

        req.user = decoded;

        next();
    } catch (err) {
        console.log("TOKEN VERIFY ERROR:", err);
        next(err);
    }
};

export default walletMiddleware;