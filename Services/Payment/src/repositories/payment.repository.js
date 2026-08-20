
class PaymentRepository{
    async createPayment(tx,data) {
        return tx.payment.create({
            data,
        });
    }

    async findById(tx, id) {
        return tx.payment.findUnique({
            where: {
                id,
            },
        });
    }

    async updateStatus(tx, id, status,failureCode) {
        if(failureCode){
            return tx.payment.update({
                where: {
                    id,
                },
                data: {
                    status,
                    failureCode
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
}