import { OZWallet } from '../entities/wallet.entity';

export interface IWalletOrchestrator {
  setupWallet(): Promise<OZWallet>;
}
