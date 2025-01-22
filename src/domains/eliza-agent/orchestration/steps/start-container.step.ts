// domains/eliza-agent/orchestrations/steps/start-container.step.ts
import { Injectable, Inject } from '@nestjs/common';
import { IDockerService } from '../../interfaces/docker-service.interface';
import { ServiceTokens } from '../../interfaces';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AgentStatus } from '../../entities/eliza-agent.entity';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';

@Injectable()
export class StartContainerStep extends BaseStepExecutor {
  constructor(
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'start-container',
      stepType: 'agent-creation',
      priority: 7,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { containerId, agentId } = context.metadata;

      await this.dockerService.startContainer(containerId);

      const runtimeAgentId =
        await this.dockerService.getRuntimeAgentId(containerId);
      if (!runtimeAgentId) {
        return this.failure('Could not retrieve runtime agent ID');
      }

      const updatedAgent = await this.prisma.elizaAgent.update({
        where: { id: agentId },
        data: {
          runtimeAgentId,
          status: AgentStatus.RUNNING,
        },
      });

      return this.success(updatedAgent, { runtimeAgentId });
    } catch (error) {
      return this.failure(`Failed to start container: ${error.message}`);
    }
  }
}
