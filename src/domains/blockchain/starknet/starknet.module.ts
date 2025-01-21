import { Module } from '@nestjs/common';
import { StarknetController } from './starknet.controller';
import { StarknetTokens } from './interfaces';
import { WalletService } from './services/wallet.service';
import { WalletOrchestratorService } from './services/wallet-orchestrator.service';

@Module({
  controllers: [StarknetController],
  providers: [
    {
      provide: StarknetTokens.Wallet,
      useClass: WalletService,
    },
    {
      provide: StarknetTokens.Orchestrator,
      useClass: WalletOrchestratorService,
    },
  ],
  exports: [StarknetTokens.Wallet, StarknetTokens.Orchestrator],
})
export class StarknetModule {}
