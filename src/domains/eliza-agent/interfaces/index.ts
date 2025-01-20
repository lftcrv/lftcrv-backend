export * from './eliza-agent-create.interface';
export * from './eliza-agent-query.interface';
export * from './eliza-agent-lifecycle.interface';
export * from './docker-service.interface';

export const ServiceTokens = {
  Docker: Symbol('IDockerService'),
  ElizaAgentCreate: Symbol('IElizaAgentCreateService'),
  ElizaAgentQuery: Symbol('IElizaAgentQueryService'),
  ElizaAgentLifecycle: Symbol('IElizaAgentLifecycleService'),
} as const;
