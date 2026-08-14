import WalletController from '../controllers/wallet.controller.js';
import { Router } from 'express';

const walletRouter = Router();

walletRouter.post('/create', WalletController.createWallet);
walletRouter.get('/', WalletController.getWallet);
walletRouter.post('/deposit', WalletController.deposit);
walletRouter.post('/withdraw', WalletController.withdraw);

export default walletRouter;