import { IStarknetWallet } from './wallet.interface';
import { IWalletOrchestrator } from './wallet-orchestrator.interface';

export type { IStarknetWallet, IWalletOrchestrator };

export const StarknetTokens = {
  Wallet: Symbol('IStarnetWallet'),
  Orchestrator: Symbol('IWalletOrchestrator'),
} as const;
