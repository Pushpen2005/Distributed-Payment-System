import WalletRepository from "../repositories/wallet.repository.js";
import ConflictError from "../../../../shared/errors/ConflictError.js";
import NotFoundError from "../../../../shared/errors/NotFoundError.js";
import ForbiddenError from "../../../../shared/errors/ForbiddenError.js";
import BadRequestError from "../../../../shared/errors/BadRequestError.js";
const WalletService = {
    async createWallet(userId) {
        const existingWallet = await WalletRepository.findByUserId(userId);
        if (existingWallet) {
            throw new ConflictError("Wallet already exists for this user.");
        }

        const walletData = {
            userId,
            balance: 0, // Initial balance
            currency: "INR", // Default currency, you can change this as needed
            status: "ACTIVE", // Default status, you can change this as needed
        };

        return WalletRepository.createWallet(walletData);   
    },
    async getWallet(userId){
        const wallet = await WalletRepository.findByUserId(userId);
        if(!wallet){
            throw new NotFoundError("Wallet not found for this user.");
        }
        return wallet;
    },

    async deposit(userId, amount) {
        if(amount<=0){
            throw new BadRequestError("Deposit amount must be greater than zero.");
        }
        const wallet = await WalletRepository.findByUserId(userId);
        if(!wallet){
            throw new NotFoundError("Wallet not found for this user.");
        }
        if(wallet.status === "ACTIVE" ){
        const newBalance = wallet.balance + amount;
        }
        return WalletRepository.updateBalance(wallet.id, newBalance);
    },

    async withdraw(userId, amount) {
        if(amount<=0){
            throw new BadRequestError("Withdrawal amount must be greater than zero.");
        }
        const wallet = await WalletRepository.findByUserId(userId);
        if (!wallet) {
            throw new NotFoundError("Wallet not found for this user.");
        }
        if (wallet.balance < amount) {
            throw new BadRequestError("Insufficient funds.");
        }
        const newBalance = wallet.balance - amount;
        return WalletRepository.updateBalance(wallet.id, newBalance);
    }
};

export default WalletService;