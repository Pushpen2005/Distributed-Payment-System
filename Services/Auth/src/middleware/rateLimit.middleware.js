import {
  rateLimitCache,
  RATE_LIMIT,
} from "../cache/rateLimit.cache.js";

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const clientKey = req.ip;
    const currentCount =
      await rateLimitCache.increment(clientKey);

    if (currentCount > RATE_LIMIT) {
      return res.status(429).json({
        error: "Too many requests",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};