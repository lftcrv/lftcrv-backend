import { ICreateAgentToken } from './create-agent-token.interface';
import { IQueryAgentToken } from './query-agent-token.interface';
import { IBondingCurveService } from './bonding-curve.interface';

export { ICreateAgentToken, IQueryAgentToken, IBondingCurveService };

export const AgentTokenTokens = {
  CreateAgentToken: Symbol('ICreateAgentToken'),
  QueryAgentToken: Symbol('IQueryAgentToken'),
  BondingCurve: Symbol('IBondingCurveService'),
} as const;
