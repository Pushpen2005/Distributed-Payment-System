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
            throw new ConflictError("Wallet already exists for this user.");
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
            throw new NotFoundError("Wallet not found for this user.");
        }

        return wallet;
    },

    async deposit(userId, amount) {
        if (amount <= 0) {
            throw new BadRequestError(
                "Deposit amount must be greater than zero."
            );
        }

        return await prisma.$transaction(async (tx) => {
            const wallet = await WalletRepository.findByUserIdForUpdate(
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

        return await prisma.$transaction(async (tx) => {
            const wallet = await WalletRepository.findByUserIdForUpdate(
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
};

export default WalletService;