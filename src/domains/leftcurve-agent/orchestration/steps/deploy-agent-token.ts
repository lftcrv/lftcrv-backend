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

  /**
   * Creates a valid token symbol from agent name
   * @param name The agent name
   * @returns A valid token symbol
   */
  private createTokenSymbol(name: string): string {
    // Remove spaces and special characters, keep only alphanumeric
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '');

    // Convert to uppercase for standard token symbol format
    let symbol = sanitized.toUpperCase();

    // Ensure symbol is between 3-5 characters
    if (symbol.length < 3) {
      // If too short, pad with agent's first letters
      symbol = symbol.padEnd(3, symbol.charAt(0));
    } else if (symbol.length > 5) {
      // If too long, truncate
      symbol = symbol.substring(0, 5);
    }

    return symbol;
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { agentId, wallet } = context.metadata;
      const dto = context.data;

      // Create meaningful symbol and token name based on agent name
      const symbol = this.createTokenSymbol(dto.name);
      const tokenName = `${dto.name.toUpperCase()} Token`;

      const agentTokenContract =
        await this.createAgentTokenService.createAgentToken({
          name: tokenName,
          symbol,
        });

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
