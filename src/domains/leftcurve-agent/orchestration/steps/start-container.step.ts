import { Injectable, Inject } from '@nestjs/common';
import { IDockerService } from '../../interfaces/docker-service.interface';
import { ServiceTokens } from '../../interfaces';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AgentStatus } from '../../entities/leftcurve-agent.entity';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { MessageService } from 'src/message/message.service';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { PerformanceSnapshotService } from 'src/domains/kpi/services/performance-snapshot.service';

@Injectable()
export class StartContainerStep extends BaseStepExecutor {
  constructor(
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly performanceSnapshotService: PerformanceSnapshotService,
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

      await this.messageService.sendMessageToAgent(runtimeAgentId, {
        content: {
          text: 'execute send_portfolio_balance',
        },
      });

      await this.performanceSnapshotService.createAgentPerformanceSnapshot(
        agentId,
      );

      return this.success(updatedAgent, {
        runtimeAgentId,
        agent: {
          id: agentId,
          name: updatedAgent.name,
        },
      });
    } catch (error) {
      return this.failure(`Failed to start container: ${error.message}`);
    }
  }
}
