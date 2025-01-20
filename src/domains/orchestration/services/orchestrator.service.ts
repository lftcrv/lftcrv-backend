// orchestrator.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  IOrchestrator,
  OrchestrationStatus,
  OrchestrationState,
  IOrchestrationDefinitionRegistry,
  IStepExecutorRegistry,
  OrchestrationServiceTokens,
} from '../interfaces';

@Injectable()
export class OrchestratorService implements IOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OrchestrationServiceTokens.OrchestrationRegistry)
    private readonly definitionRegistry: IOrchestrationDefinitionRegistry,
    @Inject(OrchestrationServiceTokens.StepExecutorRegistry)
    private readonly executorRegistry: IStepExecutorRegistry,
  ) {}

  async startOrchestration<T>(
    type: string,
    orchestrationData: T,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const definition = this.definitionRegistry.get(type);
    if (!definition) {
      throw new Error(`No orchestration definition found for type: ${type}`);
    }

    const firstStep = definition.steps[0];

    const orchestration = await this.prisma.orchestration.create({
      data: {
        type,
        status: OrchestrationStatus.PENDING,
        currentStepId: firstStep.id,
        progress: 0,
        data: orchestrationData as any,
        metadata: metadata || {},
      },
    });

    // Start the orchestration process asynchronously
    this.executeOrchestration(orchestration.id).catch((error) => {
      console.error(`Orchestration ${orchestration.id} failed:`, error);
    });

    return orchestration.id;
  }

  async getOrchestrationStatus(
    orchestrationId: string,
  ): Promise<OrchestrationState> {
    const orchestration = await this.prisma.orchestration.findUnique({
      where: { id: orchestrationId },
    });

    if (!orchestration) {
      throw new Error(`Orchestration ${orchestrationId} not found`);
    }

    return {
      id: orchestration.id,
      type: orchestration.type,
      status: orchestration.status as OrchestrationStatus,
      currentStepId: orchestration.currentStepId,
      data: orchestration.data,
      result: orchestration.result,
      error: orchestration.error,
      progress: orchestration.progress,
      createdAt: orchestration.createdAt,
      updatedAt: orchestration.updatedAt,
      metadata: orchestration.metadata as Record<string, any>,
    };
  }

  async updateOrchestrationStatus(
    orchestrationId: string,
    status: Partial<OrchestrationState>,
  ): Promise<OrchestrationState> {
    const orchestration = await this.prisma.orchestration.update({
      where: { id: orchestrationId },
      data: {
        ...status,
        updatedAt: new Date(),
      },
    });

    return {
      id: orchestration.id,
      type: orchestration.type,
      status: orchestration.status as OrchestrationStatus,
      currentStepId: orchestration.currentStepId,
      data: orchestration.data,
      result: orchestration.result,
      error: orchestration.error,
      progress: orchestration.progress,
      createdAt: orchestration.createdAt,
      updatedAt: orchestration.updatedAt,
      metadata: orchestration.metadata as Record<string, any>,
    };
  }

  private async executeOrchestration(orchestrationId: string): Promise<void> {
    const orchestration = await this.getOrchestrationStatus(orchestrationId);
    const definition = this.definitionRegistry.get(orchestration.type);

    if (!definition) {
      throw new Error(`No definition found for type: ${orchestration.type}`);
    }

    await this.updateOrchestrationStatus(orchestrationId, {
      status: OrchestrationStatus.IN_PROGRESS,
    });

    try {
      for (const step of definition.steps) {
        if (orchestration.status === OrchestrationStatus.FAILED) {
          break;
        }

        const executor = this.executorRegistry.getExecutor(
          step.id,
          orchestration.type,
        );
        if (!executor) {
          throw new Error(
            `No executor found for step: ${step.id} of type: ${orchestration.type}`,
          );
        }

        const progress = (step.order / definition.steps.length) * 100;

        await this.updateOrchestrationStatus(orchestrationId, {
          currentStepId: step.id,
          progress,
        });

        const result = await executor.execute({
          orchestrationId,
          stepId: step.id,
          data: orchestration.data,
          metadata: orchestration.metadata,
        });

        if (!result.success) {
          await this.updateOrchestrationStatus(orchestrationId, {
            status: OrchestrationStatus.FAILED,
            error: result.error,
          });
          return;
        }

        // Update metadata for next steps
        orchestration.metadata = {
          ...orchestration.metadata,
          ...result.metadata,
        };
      }

      await this.updateOrchestrationStatus(orchestrationId, {
        status: OrchestrationStatus.COMPLETED,
        progress: 100,
      });
    } catch (error) {
      await this.updateOrchestrationStatus(orchestrationId, {
        status: OrchestrationStatus.FAILED,
        error: error.message,
      });
      throw error;
    }
  }
}
