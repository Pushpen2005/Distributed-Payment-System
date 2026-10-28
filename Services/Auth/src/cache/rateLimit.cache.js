import redisClient from "../config/redis.js";

export const RATE_LIMIT = 5;
export const WINDOW_SECONDS = 60;

export const rateLimitCache = {
  async increment(clientKey) {
  const key = `rate_limit:login:${clientKey}`;
    const currentCount = await redisClient.incr(key);

    if (currentCount === 1) {
      await redisClient.expire(key, WINDOW_SECONDS);
    }

    return currentCount;
  },
};  