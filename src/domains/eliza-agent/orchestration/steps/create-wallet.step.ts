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
export class CreateWalletStep extends BaseStepExecutor {
  constructor(
    @Inject(StarknetTokens.Wallet)
    private readonly walletService: IStarknetWallet,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'create-wallet',
      stepType: 'agent-creation',
      priority: 2,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { agentId } = context.metadata;
      const wallet = this.walletService.createWallet();

      // Create wallet record in database
      const agentWallet = await this.prisma.agentWallet.create({
        data: {
          privateKey: wallet.privateKey,
          publicKey: wallet.starkKeyPub,
          contractAddress: wallet.ozContractAddress,
          elizaAgentId: agentId,
          ethPrivateKey: wallet.ethereumPrivateKey,
        },
      });

      return this.success(agentWallet, { wallet });
    } catch (error) {
      return this.failure(`Failed to create wallet: ${error.message}`);
    }
  }
}
