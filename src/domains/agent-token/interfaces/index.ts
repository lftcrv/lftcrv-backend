import { ICreateAgentToken } from './create-agent-token.interface';
import { IQueryAgentToken } from './query-agent-token.interface';

export { ICreateAgentToken, IQueryAgentToken };

export const AgentTokenTokens = {
  CreateAgentToken: Symbol('ICreateAgentToken'),
  QueryAgentToken: Symbol('IQueryAgentToken'),
} as const;
