class IdempotencyRepository {
    async findByUserAndKey(tx, userId, idempotencyKey) {
        const [record] = await tx.$queryRaw`
            SELECT *
            FROM "idempotency_keys"
            WHERE "userId" = ${userId}
              AND "idempotencyKey" = ${idempotencyKey}
            FOR UPDATE
        `;

        return record ?? null;
    }

    async createProcessingRecord(tx, processingData) {
        return tx.idempotencyKey.create({
            data: processingData,
        });
    }

    async updateStatus(tx, id, status, response) {
        return tx.idempotencyKey.update({
            where: {
                id,
            },
            data: {
                status,
                response,
            },
        });
    }
}

export default new IdempotencyRepository();