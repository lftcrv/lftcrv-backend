import { ICreateAgentToken } from './create-agent-token.interface';
import { IManageAgentToken } from './manage-agent-token.interface';

export { ICreateAgentToken, IManageAgentToken };

export const AgentTokenTokens = {
  CreateAgentToken: Symbol('ICreateAgentToken'),
  ManageAgentToken: Symbol('IManageAgentToken'),
} as const;
