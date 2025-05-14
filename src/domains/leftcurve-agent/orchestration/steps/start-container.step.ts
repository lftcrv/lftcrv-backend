import { Injectable, Inject, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(StartContainerStep.name);
  private readonly delayBetweenRequests = 20000; // 20 seconds delay

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

      // First request: initialize portfolio
      this.logger.log(
        `Sending portfolio balance request to agent with runtime ID: ${runtimeAgentId}`
      );
      await this.messageService.sendMessageToAgent(runtimeAgentId, {
        content: {
          text: 'execute send_portfolio_balance',
        },
      });

      // Wait before sending the portfolio allocation request
      this.logger.log(
        `Initial portfolio request sent successfully. Waiting ${
          this.delayBetweenRequests / 1000
        } seconds before sending portfolio allocation request...`
      );
      
      // Create performance snapshot while waiting
      await this.performanceSnapshotService.createAgentPerformanceSnapshot(
        agentId,
      );

      // Wait for the specified delay
      await new Promise((resolve) => setTimeout(resolve, this.delayBetweenRequests));

      // Second request: portfolio allocation
      this.logger.log(
        `Sending portfolio allocation request to agent with runtime ID: ${runtimeAgentId}`
      );
      await this.messageService.sendMessageToAgent(runtimeAgentId, {
        content: {
          text: "Review the available analysis and tradable cryptos. Then, based on current market conditions and the five cryptos assigned to you (plus USDC), define your portfolio allocation strategy accordingly.",
        },
      });
      
      this.logger.log(
        `Portfolio allocation request sent successfully to agent with runtime ID: ${runtimeAgentId}`
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
