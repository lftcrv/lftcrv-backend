import { Injectable, Inject } from '@nestjs/common';
import { IDockerService } from '../../interfaces/docker-service.interface';
import { ServiceTokens } from '../../interfaces';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class CreateContainerStep extends BaseStepExecutor {
  constructor(
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
    private readonly prisma: PrismaService,
  ) {
    super({
      stepId: 'create-container',
      stepType: 'agent-creation',
      priority: 6,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const dto = context.data;
      const { agentId } = context.metadata;

      const agentConfig = dto.agentConfig || dto.characterConfig;

      // Create container without wallet information
      const { containerId, port } = await this.dockerService.createContainer({
        name: dto.name,
        agentConfig: agentConfig,
        // Use placeholder/mock values instead of wallet data
        starknetAddress:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        starknetPrivateKey:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ethereumPrivateKey:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ethereumAccountAddress: '0x0000000000000000000000000000000000000000',
      });

      const updatedAgent = await this.prisma.elizaAgent.update({
        where: { id: agentId },
        data: {
          containerId,
          port,
        },
      });

      return this.success(updatedAgent, { containerId, port });
    } catch (error) {
      return this.failure(`Failed to create container: ${error.message}`);
    }
  }
}
