export enum OrchestrationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface OrchestrationStep {
  id: string;
  name: string;
  order: number;
  description?: string;
}

export interface OrchestrationDefinition {
  type: string;
  steps: OrchestrationStep[];
}

export interface OrchestrationState {
  id: string;
  type: string;
  status: OrchestrationStatus;
  currentStepId: string;
  data: any;
  result?: any;
  error?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface StepExecutionContext {
  orchestrationId: string;
  stepId: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface StepExecutionResult {
  success: boolean;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}
