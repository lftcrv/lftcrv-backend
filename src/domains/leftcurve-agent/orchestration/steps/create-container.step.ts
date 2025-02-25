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
    
      const { agentId, wallet } = context.metadata;

      const agentConfig = dto.agentConfig || dto.characterConfig;
      
      const { containerId, port } = await this.dockerService.createContainer({
        name: dto.name,
        agentConfig: agentConfig,
        starknetAddress: wallet.ozContractAddress,
        starknetPrivateKey: wallet.privateKey,
        ethereumPrivateKey: wallet.ethereumPrivateKey,
        ethereumAccountAddress: wallet.ethereumAccountAddress,
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
