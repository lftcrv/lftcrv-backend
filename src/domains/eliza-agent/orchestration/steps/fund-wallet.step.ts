import { Injectable, Inject } from '@nestjs/common';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import {
  IStarknetWallet,
  StarknetTokens,
} from '../../../../domains/blockchain/starknet/interfaces';

@Injectable()
export class FundWalletStep extends BaseStepExecutor {
  constructor(
    @Inject(StarknetTokens.Wallet)
    private readonly walletService: IStarknetWallet,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'fund-wallet',
      stepType: 'agent-creation',
      priority: 3,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { wallet } = context.metadata;
      const fundedWallet = await this.walletService.transferFunds(wallet);

      // Update wallet record with transaction hash
      const updatedWallet = await this.prisma.agentWallet.update({
        where: { elizaAgentId: context.metadata.agentId },
        data: {
          fundTransactionHash: fundedWallet.fundTransactionHash,
        },
      });

      return this.success(updatedWallet, { fundedWallet });
    } catch (error) {
      return this.failure(`Failed to fund wallet: ${error}`);
    }
  }
}
