import { IDockerService } from './docker-service.interface';
import { IElizaAgentService } from './eliza-agent-service.interface';

export type { IDockerService, IElizaAgentService };

export const ServiceTokens = {
  Docker: Symbol('IDockerService'),
  ElizaAgent: Symbol('IElizaAgentService'),
} as const;
