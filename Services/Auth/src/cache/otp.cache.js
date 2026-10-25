import redisClient from "../config/redis.js";

const OTP_TTL = 300; // 5 minutes in seconds

const getOTPkey = (userId) => {
    return `otp:${userId}`;
};

const cachedOTP = {
    async create(userId, otp) {
        const key = getOTPkey(userId);

        await redisClient.set(
            key,
            JSON.stringify(otp),
            "EX",
            OTP_TTL
        );
    },

    async get(userId) {
        const key = getOTPkey(userId);

        const data = await redisClient.get(key);

        if (data === null) {
            return null;
        }

        return JSON.parse(data);
    },

    async delete(userId) {
        const key = getOTPkey(userId);

        await redisClient.del(key);
    },
};

export default cachedOTP;   