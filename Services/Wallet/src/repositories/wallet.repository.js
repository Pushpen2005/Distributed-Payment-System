import { Prisma } from "@prisma/client";

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
    async findByUserIdForUpdate(tx, userId) {
        const wallets = await tx.$queryRaw`
            SELECT *
            FROM "wallets"
            WHERE "userId" = ${userId}
            FOR UPDATE
        `;

        return wallets[0] ?? null;
    }
    async findByIdsForUpdate(tx, walletIds) {
    return tx.$queryRaw`
        SELECT *
        FROM "wallets"
        WHERE "id" IN (${Prisma.join(walletIds)})
        ORDER BY "id"
        FOR UPDATE
    `;
}
}

export default new WalletRepository();