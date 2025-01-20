import { OrchestrationDefinition } from '../entities/orchestration.entity';

export interface IOrchestrationDefinitionRegistry {
  register(definition: OrchestrationDefinition): void;
  get(type: string): OrchestrationDefinition | undefined;
}
