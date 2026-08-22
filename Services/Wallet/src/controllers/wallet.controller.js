import WalletService from "../services/wallet.service.js";

const WalletController = {
    async createWallet(req, res, next) {
        try {
            const userId = req.user.id; // Assuming user ID is available in the request object
            const wallet = await WalletService.createWallet(userId);
            res.status(201).json({
                message: "Wallet created successfully",
                wallet,
            });
        } catch (error) {
            next(error);
        }
    },
    async getWallet(req, res, next) {
        try {
            const userId = req.user.id;
            const wallet = await WalletService.getWallet(userId);
            res.status(200).json({
                message: "Wallet fetched successfully",
                wallet,
            });
        }
        catch (error) {
            next(error);
        }
    },
    async deposit(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;
            const wallet = await WalletService.deposit(userId, amount);
            res.status(200).json({
                success: true,
                message: "Deposit successful",
                data: wallet,
            });
        }
        catch (error) {
            next(error);
        }
    },
    async withdraw(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;
            const wallet = await WalletService.withdraw(userId, amount);
            res.status(200).json({
                success: true,
                message: "Withdrawal successful",
                data: wallet,
            });
        }
        catch (error) {
            next(error);
        }
    },
    async executeTransfer(req, res, next) {
        try {
            const {
                senderWalletId,
                receiverWalletId,
                amount,
            } = req.body;

            const result = await WalletService.executeTransfer(
                senderWalletId,
                receiverWalletId,
                amount
            );

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },
    async verifyOwnership(req, res, next) {
        try {
            const { senderUserId, senderWalletId } = req.body;
            const ownsWallet = await WalletService.verifyOwnership(senderUserId, senderWalletId);
            return res.status(200).json({
                success: true,
                message: "Ownership verified successfully",
                data: {
                    ownsWallet: true
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
};

export default WalletController;