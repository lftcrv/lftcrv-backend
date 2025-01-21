import { IDockerService } from './docker-service.interface';
import { IElizaAgentQueryService } from './eliza-agent-query.interface';
import { IElizaAgentLifecycleService } from './eliza-agent-lifecycle.interface';
import {
  IElizaConfigService,
  ElizaConfig,
  CreateElizaContainerConfig,
  ElizaContainerResult,
  CacheStore,
} from './eliza-config.interface';

export type {
  IDockerService,
  IElizaAgentQueryService,
  IElizaAgentLifecycleService,
  IElizaConfigService,
  ElizaConfig,
  CreateElizaContainerConfig,
  ElizaContainerResult,
  CacheStore,
};

export const ServiceTokens = {
  Docker: Symbol('IDockerService'),
  ElizaAgentQuery: Symbol('IElizaAgentQueryService'),
  ElizaAgentLifecycle: Symbol('IElizaAgentLifecycleService'),
  ElizaConfig: Symbol('IElizaConfigService'),
} as const;
