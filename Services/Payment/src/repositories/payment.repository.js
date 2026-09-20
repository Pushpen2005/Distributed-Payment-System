class PaymentRepository {
    async createPayment(tx, data) {
        return tx.payment.create({
            data,
        });
    }

    async findById(tx, id) {
        return tx.payment.findUnique({
            where: {
                id,
            },
            include: {
                idempotency: true,
            },
        });
    }

    async updateStatus(tx, id, status, failureCode) {
        if (failureCode) {
            return tx.payment.update({
                where: {
                    id,
                },
                data: {
                    status,
                    failureCode,
                },
            });
        }

        return tx.payment.update({
            where: {
                id,
            },
            data: {
                status,
            },
        });
    }
    async findProcessingPayments(tx, limit = 100) {
        return tx.payment.findMany({
            where: {
                status: "PROCESSING",
            },
            orderBy: {
                createdAt: "asc",
            },
            take: limit,
        });
    }
}

export default new PaymentRepository();