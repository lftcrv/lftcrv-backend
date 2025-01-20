import {
  OrchestrationStep,
  OrchestrationDefinition,
  OrchestrationState,
  StepExecutionContext,
  StepExecutionResult,
  OrchestrationStatus,
} from '../entities/orchestration.entity';
import {
  IStepExecutor,
  IStepExecutorMetadata,
  IStepExecutorRegistry,
} from './step-executor.interface';
import { IOrchestrationDefinitionRegistry } from './orchestration-definition-registry.interface';
import { IOrchestrator } from './orchestrator.interface';

export type {
  OrchestrationStep,
  OrchestrationDefinition,
  OrchestrationState,
  StepExecutionContext,
  StepExecutionResult,
  IStepExecutor,
  IStepExecutorMetadata,
  IStepExecutorRegistry,
  IOrchestrationDefinitionRegistry,
  IOrchestrator,
};

export { OrchestrationStatus };

export const OrchestrationServiceTokens = {
  Orchestrator: Symbol('IOrchestrator'),
  OrchestrationRegistry: Symbol('IOrchestrationDefinitionRegistry'),
  StepExecutorRegistry: Symbol('IStepExecutorRegistry'),
} as const;
