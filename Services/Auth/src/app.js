import express from "express";
import AuthRouter from "./routes/auth.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import cookieParser from "cookie-parser";
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", AuthRouter);   
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        service: "auth-service", // Replace with your actual service name
        environment: process.env.NODE_ENV || "production",
        timestamp: new Date().toISOString()
    });
});
app.use(errorMiddleware);

export default app;