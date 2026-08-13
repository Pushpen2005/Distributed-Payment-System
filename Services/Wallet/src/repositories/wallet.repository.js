import {prisma} from "../config/prisma.js";


class WalletRepository {
    async createWallet(walletData) {
        return prisma.wallet.create({
            data: walletData,
        });
    }
    async findByUserId(userId) {
    return prisma.wallet.findUnique({
        where: {
            userId,
        },
    });
}
    async findById(id) {
        return prisma.wallet.findUnique({
            where: {
                id,
            },
        });
    }
    async updateBalance(id, balance) {
        return prisma.wallet.update({
            where: {
                id,
            },
            data: {
                balance: balance,
            },
        });
    }
    
};

export default new WalletRepository();      