import idempotencyRepository from "../repositories/idempotency.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import { prisma } from "../config/db.js";

const PaymentService = {
    async transferPayment(senderId, receiverId, amount, idempotencyKey) {
        const requestHash = `${senderId}-${receiverId}-${amount}`;

        let idempotencyRecord;

        try {
            idempotencyRecord = await idempotencyRepository.create(prisma, {
                userId: senderId,
                idempotencyKey,
                requestHash,
                status: "PROCESSING",
            });

            // INSERT succeeded.
            // This request is now the owner of processing.

        } catch (error) {
            // Only handle duplicate-key errors here.
            // Other database errors must still be thrown.

            const existingRecord =
                await idempotencyRepository.findByUserAndKey(
                    prisma,
                    senderId,
                    idempotencyKey
                );

            if (!existingRecord) {
                throw error;
            }

            if (existingRecord.requestHash !== requestHash) {
                throw new Error(
                    "Idempotency key was already used with a different request"
                );
            }

            if (existingRecord.status === "PROCESSING") {
                return {
                    status: "PROCESSING",
                    message: "Payment is already being processed",
                };
            }

            return existingRecord.response;
        }

        // Only the request whose INSERT succeeded reaches here.
        // Next: create Payment and execute the payment flow.
    },
};

export default PaymentService;