import PaymentService from "../services/payment.service.js";
import PaymentReconciliationService from "../services/payment-reconciliation.service.js";

const PaymentController = {
    async transferPayment(req, res, next) {
        try {
            console.log("Authenticated user:", req.user);

            const senderUserId = req.user.sub;

            const {
                senderWalletId,
                receiverWalletId,
                amount
            } = req.body;

            const idempotencyKey = req.headers["idempotency-key"];

            const paymentResult = await PaymentService.transferPayment(
                senderUserId,
                senderWalletId,
                receiverWalletId,
                amount,
                idempotencyKey
            );

            res.status(200).json({
                success: true,
                message: "Payment transfer successful",
                data: paymentResult,
            });
        } catch (error) {
            next(error);
        }
    },
    async paymentReconciliation(req, res, next) {
        try {
            const { paymentId } = req.params;

            const reconciliationResult =
                await PaymentReconciliationService.reconcilePayment(
                    paymentId
                );

            res.status(200).json({
                success: true,
                message: "Payment reconciliation successful",
                data: reconciliationResult,
            });
        } catch (error) {
            next(error);
        }
    },  
};

export default PaymentController;   