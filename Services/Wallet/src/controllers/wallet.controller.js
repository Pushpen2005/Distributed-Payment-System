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
    }
}

export default WalletController;