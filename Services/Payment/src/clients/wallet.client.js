import axios from "axios";

const WALLET_SERVICE_URL =
    process.env.WALLET_SERVICE_URL || "http://localhost:5000";

const walletClient = {
    async executeTransfer({
        senderWalletId,
        receiverWalletId,
        amount,
    }) {
        try {
            const response = await axios.post(
                `${WALLET_SERVICE_URL}/internal/wallets/transfer`,
                {
                    senderWalletId,
                    receiverWalletId,
                    amount,
                }
            );

            return response.data.data;

        } catch (error) {
            if (error.response) {
                const { message, code } = error.response.data;

                const walletError = new Error(
                    message || "Wallet service request failed."
                );

                walletError.code = code;
                walletError.statusCode = error.response.status;

                throw walletError;
            }

            throw new Error("Wallet service is unavailable.");
        }
    },
};

export default walletClient;