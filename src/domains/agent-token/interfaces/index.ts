import { ICreateAgentToken } from './create-agent-token.interface';

export { ICreateAgentToken };

export const AgentTokenTokens = {
  CreateAgentToken: Symbol('ICreateAgentToken'),
} as const;
