
class IdemptonyRepository {
    async findByUserAndKey(tx, userId, key) {
        const wallets = await tx.$queryRaw`
            SELECT *
            FROM "idempotency_keys"
            WHERE "userId" = ${userId} AND "idempotencyKey" = ${key}
            FOR UPDATE
        `;

        return wallets[0] ?? null;
    }
    async createProcessingRecord(tx, processingData) {
        return tx.idempotencyKey.create({
            data: processingData,
        });
    }
    async updateSuccess(tx, id, result) {
        return tx.idempotencyKey.update({
            where: {
                id,
            },
            data: {
                status: "SUCCESS",
                response: result,
            },
        });
    }
    async updateFailure(tx, id, error) {
        return tx.idempotencyKey.update({
            where: {
                id,
            },
            data: {
                status: "FAILED",
                response: result,
            },
        });
    }
};