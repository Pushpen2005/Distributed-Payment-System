import axios from "axios";

const WALLET_SERVICE_URL =
    process.env.WALLET_SERVICE_URL || "http://localhost:5000";

const walletClient = {
    async executeTransfer({
        senderWalletId,
        receiverWalletId,
        amount,
    }) {
        const response = await axios.post(
            `${WALLET_SERVICE_URL}/internal/wallets/transfer`,
            {
                senderWalletId,
                receiverWalletId,
                amount,
            }
        );

        return response.data.data;
    },
};

export default walletClient;