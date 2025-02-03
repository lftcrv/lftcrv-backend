import { Injectable, Inject } from '@nestjs/common';
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
export class DeployAgentTokenStep extends BaseStepExecutor {
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
      const { agentId, wallet } = context.metadata;
      const dto = context.data;

      console.log(
        `Deploying token for agent ${agentId} using wallet ${wallet?.deployedAddress}`,
      );

      const symbol = `ELIZA${agentId.substring(0, 4)}`;
      const tokenName = `${dto.name.toUpperCase()}_TOKEN`;

      const agentTokenContract =
        await this.createAgentTokenService.createAgentToken({
          name: tokenName,
          symbol,
        });

      console.log(
        `Token deployed at address: ${agentTokenContract.contract.address}`,
      );

      const agentToken = await this.prisma.agentToken.create({
        data: {
          token: tokenName,
          symbol,
          contractAddress: agentTokenContract.contract.address,
          elizaAgentId: agentId,
          buyTax: 0,
          sellTax: 0,
        },
      });

      return this.success(agentToken, {
        tokenAddress: agentTokenContract.contract.address,
        tokenSymbol: symbol,
      });
    } catch (error) {
      console.error(`Token deployment failed: ${error.message}`);
      return this.failure(`Failed to deploy token: ${error.message}`);
    }
  }
}
