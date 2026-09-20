import runPaymentReconciliationJob from "./payment-reconciliation.job.js";

const RECONCILIATION_INTERVAL = 60 * 1000;

let intervalId = null;

export const startPaymentReconciliationScheduler = () => {
    if (intervalId) {
        console.log(
            "[ReconciliationScheduler] Scheduler already running"
        );

        return;
    }

    console.log(
        "[ReconciliationScheduler] Starting scheduler..."
    );

    // Run once immediately when the service starts.
    runPaymentReconciliationJob();

    intervalId = setInterval(
        runPaymentReconciliationJob,
        RECONCILIATION_INTERVAL
    );
};

export const stopPaymentReconciliationScheduler = () => {
    if (!intervalId) {
        return;
    }

    clearInterval(intervalId);

    intervalId = null;

    console.log(
        "[ReconciliationScheduler] Scheduler stopped"
    );
};