
import redisClient from "../config/redis.js";

const OTP_TTL = 300;

const getOTPKey = (challengeId) => `otp:${challengeId}`;

const cachedOTP = {
  async create(challengeId, challenge) {
    const key = getOTPKey(challengeId);

    await redisClient.set(
      key,
      JSON.stringify(challenge),
      "EX",
      OTP_TTL
    );
  },

  async get(challengeId) {
    const key = getOTPKey(challengeId);
    const data = await redisClient.get(key);

    if (data === null) {
      return null;
    }

    return JSON.parse(data);
  },

  async delete(challengeId) {
    const key = getOTPKey(challengeId);
    await redisClient.del(key);
  },
};

export default cachedOTP;
