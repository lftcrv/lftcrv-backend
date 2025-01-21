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
export class DeployWalletStep extends BaseStepExecutor {
  constructor(
    @Inject(StarknetTokens.Wallet)
    private readonly walletService: IStarknetWallet,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'deploy-wallet',
      stepType: 'agent-creation',
      priority: 4,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { fundedWallet } = context.metadata;
      const deployedWallet =
        await this.walletService.deployWallet(fundedWallet);

      // Update wallet record with deployment info
      const updatedWallet = await this.prisma.agentWallet.update({
        where: { elizaAgentId: context.metadata.agentId },
        data: {
          deployTransactionHash: deployedWallet.deployTransactionHash,
          deployedAddress: deployedWallet.deployedContractAddress,
        },
      });

      return this.success(updatedWallet, { deployedWallet });
    } catch (error) {
      return this.failure(`Failed to deploy wallet: ${error.message}`);
    }
  }
}
