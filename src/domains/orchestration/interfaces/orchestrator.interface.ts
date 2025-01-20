import { OrchestrationState } from '../entities/orchestration.entity';

export interface IOrchestrator {
  startOrchestration<T>(
    type: string,
    orchestrationData: T,
    metadata?: Record<string, any>,
  ): Promise<string>;

  getOrchestrationStatus(orchestrationId: string): Promise<OrchestrationState>;

  updateOrchestrationStatus(
    orchestrationId: string,
    status: Partial<OrchestrationState>,
  ): Promise<OrchestrationState>;
}
