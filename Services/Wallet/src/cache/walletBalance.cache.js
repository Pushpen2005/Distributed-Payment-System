import redisClient from "../config/redis.js";

const WALLET_BALANCE_TTL = 60;

const getWalletBalanceKey = (walletId) => {
    return `wallet:balance:${walletId}`;
};

const WalletBalanceCache = {

    async get(walletId) {
        const key = getWalletBalanceKey(walletId);

        return redisClient.get(key);
    },

    async set(walletId, balance) {
        const key = getWalletBalanceKey(walletId);

        await redisClient.set(
            key,
            balance.toString(),
            "EX",
            WALLET_BALANCE_TTL
        );
    },

    async delete(walletId) {
        const key = getWalletBalanceKey(walletId);

        await redisClient.del(key);
    },
};

export default WalletBalanceCache;