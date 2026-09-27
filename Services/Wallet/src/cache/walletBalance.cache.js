import redisClient from "../config/redis.js";

const WALLET_TTL = 60;

const getWalletKey = (userId) => {
    return `wallet:${userId}`;
};

const cachedWallet = {
    async get(userId) {
        const key = getWalletKey(userId);

        const data = await redisClient.get(key);

        if (data === null) {
            return null;
        }

        return JSON.parse(data);
    },

    async set(userId, wallet) {
        const key = getWalletKey(userId);

        await redisClient.set(
            key,
            JSON.stringify(wallet),
            "EX",
            WALLET_TTL
        );
    },

    async delete(userId) {
        const key = getWalletKey(userId);

        await redisClient.del(key);
    },
};

export default cachedWallet;