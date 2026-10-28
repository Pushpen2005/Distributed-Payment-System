import { Router } from "express";
import AuthController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { registerSchema , loginSchema } from '../validations/auth.validation.js';
import authMiddleware from '../middleware/auth.middleware.js'
import { rateLimitMiddleware } from "../middleware/rateLimit.middleware.js";
const AuthRouter = Router();

AuthRouter.post("/register", validate(registerSchema), AuthController.register);

AuthRouter.post("/login",validate(loginSchema), rateLimitMiddleware,AuthController.login);

AuthRouter.post("/send-otp", AuthController.sendOTP);

AuthRouter.post("/verify-otp", AuthController.verifyOTP);

AuthRouter.get("/me",authMiddleware, AuthController.getUser);

AuthRouter.post("/refresh", AuthController.refresh);

AuthRouter.post('/logout',authMiddleware, AuthController.logout);

export default AuthRouter;

