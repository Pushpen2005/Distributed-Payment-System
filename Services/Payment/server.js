import 'dotenv/config'; 
import app from "./src/app.js";

import {
    startPaymentReconciliationScheduler,
    stopPaymentReconciliationScheduler,
} from "./src/jobs/payment-reconciliation.scheduler.js";

const PORT = process.env.PORT || 6000;

const server = app.listen(PORT, () => {
    console.log(`Payment Service running on port ${PORT}`);

    startPaymentReconciliationScheduler();
});

const shutdown = async (signal) => {
    console.log(
        `[Server] ${signal} received. Starting graceful shutdown...`
    );

    stopPaymentReconciliationScheduler();

    server.close(async () => {
        console.log("[Server] HTTP server closed");

        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));