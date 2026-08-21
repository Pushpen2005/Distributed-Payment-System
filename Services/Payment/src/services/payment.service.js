import { Prisma } from "@prisma/client";
import idempotencyRepository from "../repositories/idempotency.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import { prisma } from "../config/db.js";

const PaymentService = {
    async transferPayment(
    senderUserId,
    senderWalletId,
    receiverWalletId,
    amount,
    idempotencyKey
) {
        const requestHash = `${senderUserId}-${receiverWalletId}-${amount}`;

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        try {
            // Try to claim ownership of this idempotency key
            const idempotencyRecord =
                await idempotencyRepository.create(prisma, {
                    userId: senderUserId,
                    idempotencyKey,
                    requestHash,
                    status: "PROCESSING",
                    expiresAt,
                });

            // INSERT succeeded.
            // This request owns execution.

            const paymentRecord =
                await paymentRepository.createPayment(prisma, {
                    senderWalletId: senderWalletId,
                    receiverWalletId: receiverWalletId,
                    amount,
                    currency: "INR",
                    status: "PROCESSING",
                });

            await idempotencyRepository.attachPayment(
                prisma,
                idempotencyRecord.id,
                paymentRecord.id
            );

            return {
                status: "PROCESSING",
                paymentId: paymentRecord.id,
            };

        } catch (error) {
            // Only handle duplicate idempotency keys.
            if (
                !(
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002"
                )
            ) {
                throw error;
            }

            const existingRecord =
                await idempotencyRepository.findByUserAndKey(
                    prisma,
                    senderUserId,
                    idempotencyKey
                );

            if (!existingRecord) {
                throw error;
            }

            // Same key cannot be reused with a different request.
            if (existingRecord.requestHash !== requestHash) {
                throw new Error(
                    "Idempotency key was already used with a different request"
                );
            }

            // Another request currently owns and processes the payment.
            if (existingRecord.status === "PROCESSING") {
                return {
                    status: "PROCESSING",
                    message: "Payment is already being processed",
                    paymentId: existingRecord.paymentId,
                };
            }

            // Payment was already finalized.
            return existingRecord.response;
        }
    },
};

export default PaymentService;