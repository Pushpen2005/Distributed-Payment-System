import { Prisma } from "@prisma/client";

import WalletRepository from "../repositories/wallet.repository.js";
import LedgerRepository from "../repositories/ledger.repository.js";

import ConflictError from "../../../../shared/errors/ConflictError.js";
import NotFoundError from "../../../../shared/errors/NotFoundError.js";
import ForbiddenError from "../../../../shared/errors/ForbiddenError.js";
import BadRequestError from "../../../../shared/errors/BadRequestError.js";

import { prisma } from "../config/db.js";

const WalletService = {

    async createWallet(userId) {

        const existingWallet =
            await WalletRepository.findByUserId(
                prisma,
                userId
            );

        if (existingWallet) {
            throw new ConflictError(
                "Wallet already exists for this user."
            );
        }

        const walletData = {
            userId,
            balance: 0,
            currency: "INR",
            status: "ACTIVE",
        };

        return WalletRepository.createWallet(
            prisma,
            walletData
        );
    },

    async getWallet(userId) {

        const wallet =
            await WalletRepository.findByUserId(
                prisma,
                userId
            );

        if (!wallet) {
            throw new NotFoundError(
                "Wallet not found for this user."
            );
        }

        return wallet;
    },

    async deposit(userId, amount) {

        if (amount <= 0) {
            throw new BadRequestError(
                "Deposit amount must be greater than zero."
            );
        }

        return prisma.$transaction(async (tx) => {

            const wallet =
                await WalletRepository.findByUserIdForUpdate(
                    tx,
                    userId
                );

            if (!wallet) {
                throw new NotFoundError(
                    "Wallet not found for this user."
                );
            }

            if (wallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Wallet is not active."
                );
            }

            const newBalance =
                wallet.balance.plus(amount);

            return WalletRepository.updateBalance(
                tx,
                wallet.id,
                newBalance
            );
        });
    },

    async withdraw(userId, amount) {

        if (amount <= 0) {
            throw new BadRequestError(
                "Withdrawal amount must be greater than zero."
            );
        }

        return prisma.$transaction(async (tx) => {

            const wallet =
                await WalletRepository.findByUserIdForUpdate(
                    tx,
                    userId
                );

            if (!wallet) {
                throw new NotFoundError(
                    "Wallet not found for this user."
                );
            }

            if (wallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Wallet is not active."
                );
            }

            if (wallet.balance.lessThan(amount)) {
                throw new BadRequestError(
                    "Insufficient funds."
                );
            }

            const newBalance =
                wallet.balance.minus(amount);

            return WalletRepository.updateBalance(
                tx,
                wallet.id,
                newBalance
            );
        });
    },

    // Used by Payment Service to move money safely
    async executeTransfer(
        paymentId,
        senderWalletId,
        receiverWalletId,
        amount
    ) {
        if (amount <= 0) {
            throw new BadRequestError(
                "Transfer amount must be greater than zero.",
                "INVALID_AMOUNT"
            );
        }

        if (senderWalletId === receiverWalletId) {
            throw new BadRequestError(
                "Self transfer is not allowed.",
                "SELF_TRANSFER_NOT_ALLOWED"
            );
        }

        return prisma.$transaction(async (tx) => {
            const wallets = await WalletRepository.findByIdsForUpdate(
                tx,
                [senderWalletId, receiverWalletId]
            );

            if (wallets.length !== 2) {
                throw new NotFoundError(
                    "One or both wallets not found.",
                    "WALLET_NOT_FOUND"
                );
            }

            const senderWallet = wallets.find(
                (wallet) => wallet.id === senderWalletId
            );

            const receiverWallet = wallets.find(
                (wallet) => wallet.id === receiverWalletId
            );

            if (!senderWallet || !receiverWallet) {
                throw new NotFoundError(
                    "One or both wallets not found.",
                    "WALLET_NOT_FOUND"
                );
            }

            const existingEntries = await LedgerRepository.findByPaymentId(
                tx,
                paymentId
            );

            if (existingEntries.length > 0) {
                if (existingEntries.length !== 2) {
                    throw new ConflictError(
                        "Invalid ledger state for this payment.",
                        "INVALID_LEDGER_STATE"
                    );
                }

                const hasDuplicateLedgerType =
                    new Set(existingEntries.map((entry) => entry.type)).size !== 2;

                if (hasDuplicateLedgerType) {
                    throw new ConflictError(
                        "Duplicate ledger entries for this payment.",
                        "INVALID_LEDGER_STATE"
                    );
                }

                const debitEntry = existingEntries.find(
                    (entry) => entry.type === "DEBIT"
                );
                const creditEntry = existingEntries.find(
                    (entry) => entry.type === "CREDIT"
                );

                if (!debitEntry || !creditEntry) {
                    throw new ConflictError(
                        "Incomplete ledger entries for this payment.",
                        "INCOMPLETE_LEDGER_ENTRIES"
                    );
                }

                if (!debitEntry.amount.equals(creditEntry.amount)) {
                    throw new ConflictError(
                        "Debit and credit amounts do not match.",
                        "INVALID_LEDGER_STATE"
                    );
                }

                if (!debitEntry.amount.equals(amount)) {
                    throw new ConflictError(
                        "Duplicate paymentId was used with a different amount.",
                        "INVALID_TRANSFER_PARAMETERS"
                    );
                }

                if (debitEntry.walletId !== senderWalletId) {
                    throw new ConflictError(
                        "Duplicate paymentId was used with a different sender wallet.",
                        "INVALID_TRANSFER_PARAMETERS"
                    );
                }

                if (creditEntry.walletId !== receiverWalletId) {
                    throw new ConflictError(
                        "Duplicate paymentId was used with a different receiver wallet.",
                        "INVALID_TRANSFER_PARAMETERS"
                    );
                }

                return {
                    paymentId,
                    senderWalletId: debitEntry.walletId,
                    receiverWalletId: creditEntry.walletId,
                    amount: debitEntry.amount,
                    status: "SUCCESS",
                    alreadyProcessed: true,
                };
            }

            if (senderWallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Sender wallet is not active.",
                    "WALLET_FROZEN"
                );
            }

            if (receiverWallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Receiver wallet is not active.",
                    "WALLET_FROZEN"
                );
            }

            if (senderWallet.balance.lessThan(amount)) {
                throw new BadRequestError(
                    "Insufficient funds.",
                    "INSUFFICIENT_BALANCE"
                );
            }

            const senderNewBalance = senderWallet.balance.minus(amount);
            const receiverNewBalance = receiverWallet.balance.plus(amount);

            await WalletRepository.updateBalance(
                tx,
                senderWallet.id,
                senderNewBalance
            );

            await WalletRepository.updateBalance(
                tx,
                receiverWallet.id,
                receiverNewBalance
            );

            await LedgerRepository.createEntries(tx, [
                {
                    paymentId,
                    walletId: senderWallet.id,
                    type: "DEBIT",
                    amount,
                    currency: "INR",
                },
                {
                    paymentId,
                    walletId: receiverWallet.id,
                    type: "CREDIT",
                    amount,
                    currency: "INR",
                },
            ]);

            return {
                paymentId,
                senderWalletId: senderWallet.id,
                receiverWalletId: receiverWallet.id,
                amount,
                status: "SUCCESS",
                alreadyProcessed: false,
            };
        });
    },

    async verifyOwnership(
        userId,
        senderWalletId
    ) {

        const wallet =
            await WalletRepository.findById(
                prisma,
                senderWalletId
            );

        if (!wallet) {
            throw new NotFoundError(
                "Wallet not found.",
                "WALLET_NOT_FOUND"
            );
        }

        if (wallet.userId !== userId) {
            throw new ForbiddenError(
                "User does not own the wallet.",
                "WALLET_OWNERSHIP_MISMATCH"
            );
        }

        return {
            ownsWallet: true,
        };
    },

    async getTransferStatus(paymentId) {

        const ledgerEntries =
            await LedgerRepository.findByPaymentId(
                prisma,
                paymentId
            );

        // No ledger means the transfer is not known
        // by Wallet Service.
        if (ledgerEntries.length === 0) {
            return {
                paymentId,
                found: false,
                status: null,
            };
        }

        // A successful transfer must contain exactly
        // two ledger entries.
        if (ledgerEntries.length !== 2) {
            throw new ConflictError(
                "Invalid ledger state for this payment.",
                "INVALID_LEDGER_STATE"
            );
        }

        const debitEntry =
            ledgerEntries.find(
                (entry) =>
                    entry.type === "DEBIT"
            );

        const creditEntry =
            ledgerEntries.find(
                (entry) =>
                    entry.type === "CREDIT"
            );

        if (!debitEntry || !creditEntry) {
            throw new ConflictError(
                "Incomplete ledger entries for this payment.",
                "INCOMPLETE_LEDGER_ENTRIES"
            );
        }

        // Debit and credit must represent
        // the same amount.
        if (
            !debitEntry.amount.equals(
                creditEntry.amount
            )
        ) {
            throw new ConflictError(
                "Debit and credit amounts do not match.",
                "INVALID_LEDGER_STATE"
            );
        }

        return {
            paymentId,
            found: true,
            senderWalletId:
                debitEntry.walletId,
            receiverWalletId:
                creditEntry.walletId,
            amount:
                debitEntry.amount,
            status: "SUCCESS",
        };
    },
};

export default WalletService;