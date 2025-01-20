import {
  StepExecutionContext,
  StepExecutionResult,
} from '../entities/orchestration.entity';

export interface IStepExecutorMetadata {
  stepId: string;
  stepType: string;
  priority?: number;
}

export interface IStepExecutor {
  getMetadata(): IStepExecutorMetadata;
  execute(context: StepExecutionContext): Promise<StepExecutionResult>;
}

export interface IStepExecutorRegistry {
  register(executor: IStepExecutor): void;
  getExecutor(stepId: string, stepType: string): IStepExecutor | undefined;
  getExecutors(stepType: string): IStepExecutor[];
}
