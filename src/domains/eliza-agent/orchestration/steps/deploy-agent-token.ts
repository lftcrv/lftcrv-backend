import { Inject, Injectable } from '@nestjs/common';
import {
  AgentTokenTokens,
  ICreateAgentToken,
} from '../../../../domains/agent-token/interfaces';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class CreateWalletStep extends BaseStepExecutor {
  constructor(
    @Inject(AgentTokenTokens.CreateAgentToken)
    private readonly createAgentTokenService: ICreateAgentToken,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'deploy-agent-token',
      stepType: 'agent-creation',
      priority: 5,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { symbol, agentId, token } = context.metadata;
      const agentTokenContract =
        await this.createAgentTokenService.createAgentToken({
          name: token,
          symbol,
        });

      // Create agent token record in database
      const agentToken = await this.prisma.agentToken.create({
        data: {
          token,
          symbol,
          contratAddress: agentTokenContract.contract.address,
          elizaAgentId: agentId,
        },
      });

      return this.success(agentToken, { agentTokenContract });
    } catch (error) {
      return this.failure(`Failed to deploy wallet: ${error.message}`);
    }
  }
}
