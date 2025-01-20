import { IDockerService } from './docker-service.interface';
import { IElizaAgentQueryService } from './eliza-agent-query.interface';
import { IElizaAgentLifecycleService } from './eliza-agent-lifecycle.interface';

export type {
  IDockerService,
  IElizaAgentQueryService,
  IElizaAgentLifecycleService,
};

export const ServiceTokens = {
  Docker: Symbol('IDockerService'),
  ElizaAgentQuery: Symbol('IElizaAgentQueryService'),
  ElizaAgentLifecycle: Symbol('IElizaAgentLifecycleService'),
} as const;
