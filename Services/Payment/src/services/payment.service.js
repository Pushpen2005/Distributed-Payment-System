import { Prisma } from "@prisma/client";
import walletClient from "../clients/wallet.client.js";
import idempotencyRepository from "../repositories/idempotency.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import { prisma } from "../config/db.js";
import BadRequestError from "../../../../shared/errors/BadRequestError.js";

const PaymentService = {
    async transferPayment(
        senderUserId,
        senderWalletId,
        receiverWalletId,
        amount,
        idempotencyKey
    ) {
        const requestHash =
            `${senderWalletId}-${receiverWalletId}-${amount}`;

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );
        let idempotencyRecord;
        try {
            // Try to claim ownership of this idempotency key
            idempotencyRecord =
                await idempotencyRepository.create(prisma, {
                    userId: senderUserId,
                    idempotencyKey,
                    requestHash,
                    status: "PROCESSING",
                    expiresAt,
                });



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
                throw new BadRequestError(
                    "Idempotency key has already been used with a different request.",
                    "IDEMPOTENCY_KEY_REUSED"
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
        try {
            const walletResult = await walletClient.executeTransfer({
                senderWalletId,
                receiverWalletId,
                amount,
            });

            
            await paymentRepository.updateStatus(
                prisma,
                paymentRecord.id,
                "SUCCESS"
            );

            const response = {
                status: "SUCCESS",
                paymentId: paymentRecord.id,
                walletResult,
            };

            await idempotencyRepository.updateStatus(
                prisma,
                idempotencyRecord.id,
                "SUCCESS",
                response
            );

            return response;
        } catch (error) {
            const errorMessage = {
                status: "FAILED",
                paymentId: paymentRecord.id,
                message: error.message || "Payment failed.",
                code: error.code || "INTERNAL_ERROR"
            };
            await paymentRepository.updateStatus(
                prisma,
                paymentRecord.id,
                "FAILED",
                error.code || "INTERNAL_ERROR"
            );

            await idempotencyRepository.updateStatus(
                prisma,
                idempotencyRecord.id,
                "FAILED",
                errorMessage
            );

            throw error;
        }
    },
};

export default PaymentService;