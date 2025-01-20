import {
  IStepExecutor,
  StepExecutionContext,
  StepExecutionResult,
} from '../interfaces';
import { IStepExecutorMetadata } from '../interfaces/step-executor.interface';

export abstract class BaseStepExecutor implements IStepExecutor {
  constructor(private readonly metadata: IStepExecutorMetadata) {}

  getMetadata(): IStepExecutorMetadata {
    return this.metadata;
  }

  abstract execute(context: StepExecutionContext): Promise<StepExecutionResult>;

  protected success(
    result?: any,
    metadata?: Record<string, any>,
  ): StepExecutionResult {
    return {
      success: true,
      result,
      metadata,
    };
  }

  protected failure(error: string): StepExecutionResult {
    return {
      success: false,
      error,
    };
  }
}
