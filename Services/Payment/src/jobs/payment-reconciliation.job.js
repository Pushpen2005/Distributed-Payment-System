import {prisma} from "../config/db.js";
import paymentRepository from "../repositories/payment.repository.js";
import paymentReconciliationService from "../services/payment-reconciliation.service.js";

const BATCH_SIZE = 100;

let isRunning = false;

const runPaymentReconciliationJob = async () => {
    if (isRunning) {
        console.log(
            "[ReconciliationJob] Previous reconciliation is still running. Skipping this run."
        );

        return;
    }

    isRunning = true;

    const startedAt = Date.now();

    try {
        console.log("[ReconciliationJob] Starting reconciliation...");

        const payments = await paymentRepository.findProcessingPayments(
            prisma,
            BATCH_SIZE
        );

        console.log(
            `[ReconciliationJob] Found ${payments.length} PROCESSING payments`
        );

        for (const payment of payments) {
            try {
                console.log(
                    `[ReconciliationJob] Reconciling payment ${payment.id}`
                );

                await paymentReconciliationService.reconcilePayment(
                    payment.id
                );

                console.log(
                    `[ReconciliationJob] Reconciled payment ${payment.id}`
                );
            } catch (error) {
                console.error(
                    `[ReconciliationJob] Failed to reconcile payment ${payment.id}`,
                    error
                );

                // Important:
                // One failed payment must not stop reconciliation
                // for the remaining payments.
            }
        }

        const duration = Date.now() - startedAt;

        console.log(
            `[ReconciliationJob] Completed in ${duration}ms`
        );
    } catch (error) {
        console.error(
            "[ReconciliationJob] Job failed",
            error
        );
    } finally {
        isRunning = false;
    }
};

export default runPaymentReconciliationJob;