import WalletRepository from "../repositories/wallet.repository.js";

import ConflictError from "../../../../shared/errors/ConflictError.js";
import NotFoundError from "../../../../shared/errors/NotFoundError.js";
import ForbiddenError from "../../../../shared/errors/ForbiddenError.js";
import BadRequestError from "../../../../shared/errors/BadRequestError.js";

import { prisma } from "../config/db.js";

const WalletService = {
    async createWallet(userId) {
        const existingWallet = await WalletRepository.findByUserId(
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

        return WalletRepository.createWallet(prisma, walletData);
    },

    async getWallet(userId) {
        const wallet = await WalletRepository.findByUserId(
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

            const newBalance = wallet.balance.plus(amount);

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
                throw new BadRequestError("Insufficient funds.");
            }

            const newBalance = wallet.balance.minus(amount);

            return WalletRepository.updateBalance(
                tx,
                wallet.id,
                newBalance
            );
        });
    },

    // Used by Payment Service to move money safely
    async executeTransfer(
        senderWalletId,
        receiverWalletId,
        amount
    ) {
        // 1. Validate amount
        if (amount <= 0) {
            throw new BadRequestError(
                "Transfer amount must be greater than zero."
            );
        }

        // 2. Reject self transfer
        if (senderWalletId === receiverWalletId) {
            throw new BadRequestError(
                "Self transfer is not allowed.",
                "SELF_TRANSFER_NOT_ALLOWED"
            );
        }

        // 3. Start atomic transaction
        return prisma.$transaction(async (tx) => {
            // 4. Lock both wallets
            const wallets =
                await WalletRepository.findByIdsForUpdate(
                    tx,
                    [senderWalletId, receiverWalletId]
                );

            // 5. Both wallets must exist
            if (wallets.length !== 2) {
                throw new NotFoundError(
                    "One or both wallets not found.",
                    "WALLET_NOT_FOUND"
                );
            }

            // 6. ORDER BY id means we cannot assume
            // wallets[0] is the sender
            const senderWallet = wallets.find(
                (wallet) => wallet.id === senderWalletId
            );

            const receiverWallet = wallets.find(
                (wallet) => wallet.id === receiverWalletId
            );

            // Defensive check
            if (!senderWallet || !receiverWallet) {
                throw new NotFoundError(
                    "One or both wallets not found.",
                    "WALLET_NOT_FOUND"
                );
            }

            // 7. Validate sender wallet
            if (senderWallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Sender wallet is not active.",
                    "WALLET_FROZEN"
                );
            }

            // 8. Validate receiver wallet
            if (receiverWallet.status !== "ACTIVE") {
                throw new ForbiddenError(
                    "Receiver wallet is not active.",
                    "WALLET_FROZEN"
                );
            }

            // 9. Check sender balance
            if (senderWallet.balance.lessThan(amount)) {
                throw new BadRequestError(
                    "Insufficient funds.",
                    "INSUFFICIENT_BALANCE"
                );
            }

            // 10. Calculate new balances
            const senderNewBalance =
                senderWallet.balance.minus(amount);

            const receiverNewBalance =
                receiverWallet.balance.plus(amount);

            // 11. Debit sender
            await WalletRepository.updateBalance(
                tx,
                senderWallet.id,
                senderNewBalance
            );

            // 12. Credit receiver
            await WalletRepository.updateBalance(
                tx,
                receiverWallet.id,
                receiverNewBalance
            );

            // If we reach here, both updates commit together
            return {
                senderWalletId: senderWallet.id,
                receiverWalletId: receiverWallet.id,
                amount,
                status: "SUCCESS",
            };
        });
    },
    async verifyOwnership(userId, senderWalletId) {
            const wallet = await WalletRepository.findById(
                prisma,
                senderWalletId
            );
            if(!wallet){
                throw new NotFoundError(
                    "Wallet not found.",
                    "WALLET_NOT_FOUND"
                );
            }
            if(wallet.userId !== userId){
                throw new ForbiddenError(
                    "User does not own the wallet.",
                    "WALLET_OWNERSHIP_MISMATCH"
                );
            }
            const result = {
                ownsWallet: true,
            }
            return result;
        }
};

export default WalletService;