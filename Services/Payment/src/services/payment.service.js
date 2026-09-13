import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

import walletClient from "../clients/wallet.client.js";
import paymentRepository from "../repositories/payment.repository.js";
import idempotencyRepository from "../repositories/idempotency.repository.js";

import BadRequestError from "../../../../shared/errors/BadRequestError.js";

const PaymentService = {
    async transferPayment(
    senderUserId,
    senderWalletId,
    receiverWalletId,
    amount,
    idempotencyKey
) {
    if (amount <= 0) {
        throw new BadRequestError(
            "Amount must be greater than zero.",
            "INVALID_AMOUNT"
        );
    }

    // Verify wallet ownership first
    const verifyOwnershipResult =
        await walletClient.verifyOwnership({
            senderUserId,
            senderWalletId,
        });

    if (!verifyOwnershipResult.ownsWallet) {
        throw new BadRequestError(
            "User does not own the sender wallet.",
            "USER_NOT_OWNER"
        );
    }

    const requestHash =
        `${senderWalletId}-${receiverWalletId}-${amount}-INR`;

    const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000
    );

    let idempotencyRecord;

    try {
        idempotencyRecord =
            await idempotencyRepository.create(prisma, {
                userId: senderUserId,
                idempotencyKey,
                requestHash,
                status: "PROCESSING",
                expiresAt,
            });
    } catch (error) {
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

        if (existingRecord.requestHash !== requestHash) {
            throw new BadRequestError(
                "Idempotency key has already been used with a different request.",
                "IDEMPOTENCY_KEY_REUSED"
            );
        }

        if (
            existingRecord.expiresAt &&
            existingRecord.expiresAt < new Date()
        ) {
            throw new BadRequestError(
                "Idempotency key has expired.",
                "IDEMPOTENCY_KEY_EXPIRED"
            );
        }

        if (existingRecord.status === "PROCESSING") {
            return {
                status: "PROCESSING",
                message: "Payment is already being processed.",
                paymentId: existingRecord.paymentId,
            };
        }

        return existingRecord.response;
    }

    let paymentRecord;

    try {
        paymentRecord = await prisma.$transaction(async (tx) => {
            const payment =
                await paymentRepository.createPayment(tx, {
                    senderWalletId,
                    receiverWalletId,
                    amount,
                    currency: "INR",
                    status: "PROCESSING",
                });

            await idempotencyRepository.attachPayment(
                tx,
                idempotencyRecord.id,
                payment.id
            );

            return payment;
        });
    } catch (error) {
        const failureResponse = {
            status: "FAILED",
            message: "Payment initialization failed.",
            code: "PAYMENT_INITIALIZATION_FAILED",
        };

        await idempotencyRepository.updateStatus(
            prisma,
            idempotencyRecord.id,
            "FAILED",
            failureResponse
        );

        throw error;
    }

    try {
        const walletResult =
            await walletClient.executeTransfer({
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
        const failureResponse = {
            status: "FAILED",
            paymentId: paymentRecord.id,
            message: error.message || "Payment failed.",
            code: error.code || "INTERNAL_ERROR",
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
            failureResponse
        ); 
        throw error;
    }
},
};

export default PaymentService;

