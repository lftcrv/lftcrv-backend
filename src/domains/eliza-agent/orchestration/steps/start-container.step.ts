import { Injectable, Inject } from '@nestjs/common';
import { IDockerService } from '../../interfaces/docker-service.interface';
import { ServiceTokens } from '../../interfaces';
import { BaseStepExecutor } from 'src/domains/orchestration/services/base-step-executor';
import {
  StepExecutionContext,
  StepExecutionResult,
} from 'src/domains/orchestration/interfaces';

@Injectable()
export class StartContainerStep extends BaseStepExecutor {
  constructor(
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
  ) {
    super({
      stepId: 'start-container',
      stepType: 'agent-creation',
      priority: 3,
    });
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const { containerId } = context.metadata;
      await this.dockerService.startContainer(containerId);

      const runtimeAgentId =
        await this.dockerService.getRuntimeAgentId(containerId);
      if (!runtimeAgentId) {
        return this.failure('Could not retrieve runtime agent ID');
      }

      return this.success(null, { runtimeAgentId });
    } catch (error) {
      return this.failure(`Failed to start container: ${error.message}`);
    }
  }
}
