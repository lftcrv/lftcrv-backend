import { Injectable } from '@nestjs/common';
import {
  IOrchestrationDefinitionRegistry,
  OrchestrationDefinition,
  IStepExecutor,
} from '../interfaces';

@Injectable()
export class OrchestrationRegistry implements IOrchestrationDefinitionRegistry {
  private definitions: Map<string, OrchestrationDefinition> = new Map();
  private executors: Map<string, IStepExecutor> = new Map();

  register(definition: OrchestrationDefinition): void {
    // Validate that all steps are unique
    const stepIds = new Set(definition.steps.map((step) => step.id));
    if (stepIds.size !== definition.steps.length) {
      throw new Error(
        `Duplicate step IDs found in orchestration type: ${definition.type}`,
      );
    }

    // Validate step order
    const sortedSteps = [...definition.steps].sort((a, b) => a.order - b.order);
    if (!sortedSteps.every((step, index) => step.order === index + 1)) {
      throw new Error(
        `Invalid step order in orchestration type: ${definition.type}`,
      );
    }

    this.definitions.set(definition.type, {
      ...definition,
      steps: sortedSteps,
    });
  }

  get(type: string): OrchestrationDefinition | undefined {
    return this.definitions.get(type);
  }

  registerExecutor(stepId: string, executor: IStepExecutor): void {
    this.executors.set(stepId, executor);
  }

  getExecutor(stepId: string): IStepExecutor | undefined {
    return this.executors.get(stepId);
  }
}
