import { Injectable, Inject } from '@nestjs/common';
import { OZWallet } from '../entities/wallet.entity';
import { IWalletOrchestrator } from '../interfaces/wallet-orchestrator.interface';
import { IStarknetWallet, StarknetTokens } from '../interfaces';

@Injectable()
export class WalletOrchestratorService implements IWalletOrchestrator {
  constructor(
    @Inject(StarknetTokens.Wallet)
    private readonly walletService: IStarknetWallet,
  ) {}

  async setupWallet(): Promise<OZWallet> {
    try {
      const wallet = this.walletService.createWallet();

      // Step 2: Fund the wallet
      const fundedWallet = await this.walletService.transferFunds(wallet);

      // Step 3: Deploy the wallet
      const deployedWallet =
        await this.walletService.deployWallet(fundedWallet);

      return deployedWallet;
    } catch (error) {
      // Handle any errors and update wallet status accordingly
      throw error;
    }
  }
}
