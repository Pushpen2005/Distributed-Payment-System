import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
    console.log("Redis connecting...");
});

redisClient.on("ready", () => {
    console.log("Redis connected and ready");
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

redisClient.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

redisClient.on("close", () => {
    console.log("Redis connection closed");
});
const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down...`);

    try {
        await redisClient.quit();

        console.log("Redis connection closed");

        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default redisClient;