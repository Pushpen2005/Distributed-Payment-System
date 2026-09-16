class LedgerRepository {
    async create(tx, data) {
        return tx.ledger.create({
            data,
        });
    }
    async createEntries(tx, entries) {
        return tx.ledger.createMany({
            data: entries,
        });
    }

    async findByPaymentId(tx, paymentId) {
        return tx.ledger.findMany({
            where: { paymentId },
            orderBy: {
                createdAt: "asc",
            },
        });
    }
    async findByWalletId(tx, walletId) {
        return tx.ledger.findMany({
            where: { walletId },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
}

export default new LedgerRepository();