class IdempotencyRepository {
    async create(tx, data) {
        return tx.idempotencyKey.create({
            data,
        });
    }

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

    async attachPayment(tx, idempotencyRecordId, paymentId) {
        return tx.idempotencyKey.update({
            where: {
                id: idempotencyRecordId,
            },
            data: {
                paymentId,
            },
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