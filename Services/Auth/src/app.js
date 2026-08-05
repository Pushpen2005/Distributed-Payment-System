import express from "express";


const app = express();
app.use(express.json());
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        service: "auth-service", // Replace with your actual service name
        environment: process.env.NODE_ENV || "production",
        timestamp: new Date().toISOString()
    });
});

export default app;