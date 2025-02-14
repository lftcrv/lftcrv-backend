import { Injectable, Inject } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  BlockchainTokens,
  IProviderService,
} from '../../../../shared/blockchain/interfaces';

@Injectable()
export class CreateDbRecordStep extends BaseStepExecutor {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
  ) {
    super({
      stepId: 'create-db-record',
      stepType: 'agent-creation',
      priority: 1,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const dto = context.data;

      // Verify transaction hash exists
      if (!dto.transactionHash) {
        return this.failure('Missing transaction hash for deployment payment');
      }

      // // Check transaction status
      // try {
      //   const provider = this.providerService.getProvider();
      //   const txStatus = await provider.getTransactionStatus(
      //     dto.transactionHash,
      //   );

      //   if (txStatus.finality_status !== 'ACCEPTED_ON_L2') {
      //     return this.failure(
      //       `Transaction not confirmed on L2. Status: ${txStatus.finality_status}`,
      //     );
      //   }
      // } catch (error) {
      //   return this.failure(
      //     `Failed to verify transaction status: ${error.message}`,
      //   );
      // }

      const createInput = {
        name: dto.name,
        curveSide: dto.curveSide,
        status: AgentStatus.STARTING,
        characterConfig: dto.characterConfig,
        creatorWallet: dto.creatorWallet,
        deploymentFeesTxHash: dto.transactionHash,
        degenScore: 0,
        winScore: 0,
        LatestMarketData: {
          create: {
            price: 0,
            priceChange24h: 0,
            holders: 0,
            marketCap: 0,
          },
        },
      };

      const agent = await this.prisma.elizaAgent.create({
        data: createInput,
      });

      console.log('🔐 Payment TX status verified:', dto.transactionHash);

      return this.success(agent, { agentId: agent.id });
    } catch (error) {
      console.error('Agent creation failed:', {
        error: error.message,
        dto: context.data,
      });
      return this.failure(`Failed to create agent record: ${error.message}`);
    }
  }
}
