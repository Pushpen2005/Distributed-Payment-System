import express from "express"
import walletRouter from "./routes/wallet.route.js";

const app = express();
app.use(express.json());
app.use("/wallet", walletRouter);

export default app;