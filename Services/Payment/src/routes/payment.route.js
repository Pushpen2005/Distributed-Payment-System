import { Router } from "express";
import PaymentController from "../controllers/payment.controller.js";
import paymentMiddleware from "../middleware/payment.middleware.js";
import validate from "../middleware/validate.js";
import { transferPaymentSchema,paymentHeadersSchema } from "../validations/payment.validation.js";
const paymentRouter = Router();

paymentRouter.post(
    "/transfer",
    paymentMiddleware,
    validate(transferPaymentSchema, paymentHeadersSchema),
    PaymentController.transferPayment
);
paymentRouter.post(
    "/reconcile/:paymentId",paymentMiddleware,
    PaymentController.paymentReconciliation
);

export default paymentRouter;