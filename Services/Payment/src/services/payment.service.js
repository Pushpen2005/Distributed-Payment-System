import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

import walletClient from "../clients/wallet.client.js";
import paymentRepository from "../repositories/payment.repository.js";
import idempotencyRepository from "../repositories/idempotency.repository.js";

import AppError from "../../../../shared/errors/AppError.js";
import BadRequestError from "../../../../shared/errors/BadRequestError.js";

const PAYMENT_FAILURE_CODES = new Set([
    "INSUFFICIENT_BALANCE",
    "WALLET_NOT_FOUND",
    "WALLET_FROZEN",
    "SELF_TRANSFER_NOT_ALLOWED",
    "INTERNAL_ERROR",
]);

const getFailureCode = (code) =>
    PAYMENT_FAILURE_CODES.has(code) ? code : "INTERNAL_ERROR";

const isUniqueConstraintError = (error) =>
    (error instanceof Prisma.PrismaClientKnownRequestError ||
        error?.constructor?.name === "PrismaClientKnownRequestError") &&
    error.code === "P2002";

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
if (senderWalletId === receiverWalletId) {
    throw new BadRequestError(
        "Sender and receiver wallets must be different.",
        "SELF_TRANSFER_NOT_ALLOWED"
    );
}
    //Verify wallet ownership first
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
        if (!isUniqueConstraintError(error)) {
            throw error;
        }

        const existingRecord =
            await idempotencyRepository.findByUserAndKey(
                prisma,
                senderUserId,
                idempotencyKey
            );

        if (!existingRecord) {
            if (!error.statusCode) {
                throw new AppError(
                    error.message || "Payment failed.",
                    400,
                    failureCode
                );
            }

            throw error;
        }

        if (existingRecord.requestHash !== requestHash) {
            throw new BadRequestError(
                "Idempotency key has already been used with a different request.",
                "IDEMPOTENCY_KEY_REUSED"
            );
        }

        if (
            existingRecord.status === "PROCESSING" &&
            existingRecord.expiresAt &&
            existingRecord.expiresAt < new Date()
        ) {
            // An expired record may represent a transfer whose response was
            // lost. Keep it reserved until reconciliation determines its state.
            if (existingRecord.paymentId) {
                return {
                    status: "PROCESSING",
                    message: "Payment outcome is still being reconciled.",
                    paymentId: existingRecord.paymentId,
                };
            }

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

        return existingRecord.response || {
            status: existingRecord.status,
            paymentId: existingRecord.paymentId,
        };
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

    const markSuccessful = async (walletResult) => {
        await prisma.$transaction(async (tx) => {
            await paymentRepository.updateStatus(
                tx,
                paymentRecord.id,
                "SUCCESS"
            );

            const response = {
                status: "SUCCESS",
                paymentId: paymentRecord.id,
                walletResult,
            };

            await idempotencyRepository.updateStatus(
                tx,
                idempotencyRecord.id,
                "SUCCESS",
                response
            );
        });

        return {
            status: "SUCCESS",
            paymentId: paymentRecord.id,
            walletResult,
        };
    };

    try {
        const walletResult = await walletClient.executeTransfer({
            paymentId: paymentRecord.id,
            senderWalletId,
            receiverWalletId,
            amount,
        });

        return await markSuccessful(walletResult);
    } catch (error) {
        const isTransportFailure = !error.response && !error.statusCode;

        if (isTransportFailure) {
            let walletStatus;

            try {
                walletStatus = await walletClient.getTransferStatus(
                    paymentRecord.id
                );
            } catch {
                throw new AppError(
                    "Payment is still being reconciled.",
                    503,
                    "TRANSFER_OUTCOME_UNKNOWN"
                );
            }

            if (walletStatus?.status === "SUCCESS") {
                return await markSuccessful(walletStatus);
            }

            if (walletStatus?.status !== "FAILED") {
                throw new AppError(
                    "Payment is still being reconciled.",
                    503,
                    "TRANSFER_OUTCOME_UNKNOWN"
                );
            }

            error.code = getFailureCode(walletStatus.failureCode);
        }

        const failureCode = getFailureCode(error.code);
        const failureResponse = {
            status: "FAILED",
            paymentId: paymentRecord.id,
            message: error.message || "Payment failed.",
            code: failureCode,
        };

        await prisma.$transaction(async (tx) => {
            await paymentRepository.updateStatus(
                tx,
                paymentRecord.id,
                "FAILED",
                failureCode
            );

            await idempotencyRepository.updateStatus(
                tx,
                idempotencyRecord.id,
                "FAILED",
                failureResponse
            );
        });

        throw error;
    }

},
};

export default PaymentService;
