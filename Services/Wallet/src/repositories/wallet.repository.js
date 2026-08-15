

class WalletRepository {
    async createWallet(db, walletData) {
        return db.wallet.create({
            data: walletData,
        });
    }

    async findByUserId(db, userId) {
        return db.wallet.findUnique({
            where: {
                userId,
            },
        });
    }

    async findById(db, id) {
        return db.wallet.findUnique({
            where: {
                id,
            },
        });
    }

    async updateBalance(db, id, balance) {
        return db.wallet.update({
            where: {
                id,
            },
            data: {
                balance,
            },
        });
    }
}

export default new WalletRepository();