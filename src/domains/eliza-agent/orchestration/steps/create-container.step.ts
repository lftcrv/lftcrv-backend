import { Injectable, Inject } from '@nestjs/common';
import { IDockerService } from '../../interfaces/docker-service.interface';
import { ServiceTokens } from '../../interfaces';
import {
  StepExecutionContext,
  StepExecutionResult,
} from 'src/domains/orchestration/interfaces';
import { BaseStepExecutor } from 'src/domains/orchestration/services/base-step-executor';

@Injectable()
export class CreateContainerStep extends BaseStepExecutor {
  constructor(
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
  ) {
    super({
      stepId: 'create-container',
      stepType: 'agent-creation',
      priority: 2,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const dto = context.data;

      const { containerId, port } = await this.dockerService.createContainer({
        name: dto.name,
        characterConfig: dto.characterConfig,
      });

      return this.success(null, { containerId, port });
    } catch (error) {
      return this.failure(`Failed to create container: ${error.message}`);
    }
  }
}
