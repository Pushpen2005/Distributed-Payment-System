

class WalletRepository {
    async createWallet(client, walletData) {
        return client.wallet.create({
            data: walletData,
        });
    }

    async findByUserId(client, userId) {
        return client.wallet.findUnique({
            where: {
                userId,
            },
        });
    }

    async findById(client, id) {
        return client.wallet.findUnique({
            where: {
                id,
            },
        });
    }

    async updateBalance(client, id, balance) {
        return client.wallet.update({
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