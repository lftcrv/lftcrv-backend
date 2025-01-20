import { Injectable } from '@nestjs/common';
import {
  IStepExecutor,
  IStepExecutorRegistry,
} from '../interfaces/step-executor.interface';

@Injectable()
export class StepExecutorRegistry implements IStepExecutorRegistry {
  private executors: Map<string, Map<string, IStepExecutor>> = new Map();

  register(executor: IStepExecutor): void {
    const metadata = executor.getMetadata();
    const { stepType, stepId } = metadata;

    if (!this.executors.has(stepType)) {
      this.executors.set(stepType, new Map());
    }

    const typeExecutors = this.executors.get(stepType)!;
    if (typeExecutors.has(stepId)) {
      throw new Error(
        `Executor for step ${stepId} of type ${stepType} is already registered`,
      );
    }

    typeExecutors.set(stepId, executor);
  }

  getExecutor(stepId: string, stepType: string): IStepExecutor | undefined {
    const typeExecutors = this.executors.get(stepType);
    if (!typeExecutors) {
      return undefined;
    }
    return typeExecutors.get(stepId);
  }

  getExecutors(stepType: string): IStepExecutor[] {
    const typeExecutors = this.executors.get(stepType);
    if (!typeExecutors) {
      return [];
    }
    return Array.from(typeExecutors.values()).sort((a, b) => {
      const priorityA = a.getMetadata().priority || 0;
      const priorityB = b.getMetadata().priority || 0;
      return priorityB - priorityA;
    });
  }
}
