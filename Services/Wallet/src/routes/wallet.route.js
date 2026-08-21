import WalletController from '../controllers/wallet.controller.js';
import { Router } from 'express';
import walletMiddleware from '../middleware/wallet.middleware.js';
import {createWalletSchema, depositSchema, withdrawSchema} from '../validations/wallet.validation.js';
import validate from '../middleware/validate.js';
const walletRouter = Router();

walletRouter.post('/create', walletMiddleware, validate(createWalletSchema), WalletController.createWallet);
walletRouter.get('/', walletMiddleware, WalletController.getWallet);
walletRouter.post('/deposit', walletMiddleware, validate(depositSchema), WalletController.deposit);
walletRouter.post('/withdraw', walletMiddleware, validate(withdrawSchema), WalletController.withdraw);
walletRouter.post(
    "/internal/wallets/transfer",
    WalletController.executeTransfer
);
export default walletRouter;