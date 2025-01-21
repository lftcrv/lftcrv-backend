import { Injectable } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class CreateDbRecordStep extends BaseStepExecutor {
  constructor(private readonly prisma: PrismaService) {
    super({
      stepId: 'create-db-record',
      stepType: 'agent-creation',
      priority: 1,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const dto = context.data;
      const agent = await this.prisma.elizaAgent.create({
        data: {
          name: dto.name,
          curveSide: dto.curveSide,
          status: AgentStatus.STARTING,
          characterConfig: dto.characterConfig,
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
        },
      });

      return this.success(agent, { agentId: agent.id });
    } catch (error) {
      return this.failure(`Failed to create agent record: ${error.message}`);
    }
  }
}
