import { prisma } from "../config/db.js";

import paymentRepository from "../repositories/payment.repository.js";
import idempotencyRepository from "../repositories/idempotency.repository.js";

import walletClient from "../clients/wallet.client.js";

import NotFoundError from "../../../../shared/errors/NotFoundError.js";

const PaymentReconciliationService = {
    async reconcilePayment(paymentId) {
        const payment = await paymentRepository.findById(
            prisma,
            paymentId
        );

        if (!payment) {
            throw new NotFoundError("Payment not found.");
        }

        // Already resolved
        if (payment.status === "SUCCESS") {
            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: payment.status,
                changed: false,
                reason: "PAYMENT_ALREADY_SUCCESS",
            };
        }

        if (payment.status === "FAILED") {
            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: payment.status,
                changed: false,
                reason: "PAYMENT_ALREADY_FAILED",
            };
        }

        // Only PROCESSING payments need reconciliation
        if (payment.status !== "PROCESSING") {
            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: payment.status,
                changed: false,
                reason: "PAYMENT_NOT_RECONCILABLE",
            };
        }

        // Ask Wallet Service for actual transfer state
        const walletStatus =
            await walletClient.getTransferStatus(paymentId);

        // Unknown state — do NOT mark FAILED
        if (!walletStatus?.found) {
            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: "PROCESSING",
                changed: false,
                reason: "TRANSFER_STATE_UNKNOWN",
            };
        }

        // Wallet confirms SUCCESS
        if (walletStatus.status === "SUCCESS") {
            const response = {
                status: "SUCCESS",
                paymentId: payment.id,
                message: "Payment reconciled successfully.",
            };

            await prisma.$transaction(async (tx) => {
                await paymentRepository.updateStatus(
                    tx,
                    payment.id,
                    "SUCCESS"
                );

                if (payment.idempotency) {
                    await idempotencyRepository.updateStatus(
                        tx,
                        payment.idempotency.id,
                        "SUCCESS",
                        response
                    );
                }
            });

            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: "SUCCESS",
                changed: true,
            };
        }

        // Wallet confirms FAILED
        if (walletStatus.status === "FAILED") {
            const failureCode =
                walletStatus.failureCode || "INTERNAL_ERROR";

            const response = {
                status: "FAILED",
                paymentId: payment.id,
                message:
                    "Payment reconciliation determined that the transfer failed.",
                code: failureCode,
            };

            await prisma.$transaction(async (tx) => {
                await paymentRepository.updateStatus(
                    tx,
                    payment.id,
                    "FAILED",
                    failureCode
                );

                if (payment.idempotency) {
                    await idempotencyRepository.updateStatus(
                        tx,
                        payment.idempotency.id,
                        "FAILED",
                        response
                    );
                }
            });

            return {
                paymentId: payment.id,
                previousStatus: payment.status,
                reconciledStatus: "FAILED",
                changed: true,
            };
        }

        // Wallet still reports PROCESSING/unknown state
        return {
            paymentId: payment.id,
            previousStatus: payment.status,
            reconciledStatus: "PROCESSING",
            changed: false,
            reason: "TRANSFER_STILL_PROCESSING",
        };
    },
};

export default PaymentReconciliationService;