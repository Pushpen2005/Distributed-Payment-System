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
  const challengeKey = getOTPKey(challengeId);
  const attemptsKey = `otp:attempts:${challengeId}`;

  await redisClient.del(challengeKey, attemptsKey);
},
  async incrementAttempts(challengeId) {
  const key = `otp:attempts:${challengeId}`;

  const attempts = await redisClient.incr(key);

  if (attempts === 1) {
    await redisClient.expire(key, OTP_TTL);
  }

  return attempts;
},
};

export default cachedOTP;
