import express from "express";
import walletRouter from "./routes/wallet.route.js";
import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    console.log("🔥 HEALTH ENDPOINT HIT");

    res.status(200).json({
        message: "Wallet service is alive"
    });
});

app.use("/wallet", walletRouter);

app.use(errorMiddleware);

export default app;