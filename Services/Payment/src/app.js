import express from "express";
import errorMiddleware from "../../../../shared/middleware/errorMiddleware.js";
import paymentRouter from "./routes/payment.route.js";
const app = express();

app.use(express.json());
app.use("/payment", paymentRouter);
app.use(errorMiddleware);

export default app;