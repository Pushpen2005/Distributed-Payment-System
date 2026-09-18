import { Router } from "express";
import PaymentController from "../controllers/payment.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import { transferPaymentSchema } from "../validations/payment.validation.js";
const paymentRouter = Router();

paymentRouter.post("/transfer", authMiddleware, validate(transferPaymentSchema), PaymentController.transferPayment);

export default paymentRouter;