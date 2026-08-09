import {verifyAccessToken} from "../utils/jwt.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";

const authMiddleware = (req,res,next) => {
    const token = req.cookies.accessToken;
    if(!token){
        throw new UnauthorizedError("Access token is missing");
    }
    try{
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    }catch(err){
        next(err);
    }
}
export default authMiddleware;