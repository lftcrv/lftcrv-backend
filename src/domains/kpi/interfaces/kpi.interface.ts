import { AccountBalanceDto } from '../dtos/kpi.dto';

export const AccountBalanceTokens = {
  AccountBalance: 'ACCOUNT_BALANCE',
  PnLCalculation: 'PNL_CALCULATION',
} as const;

export interface IAccountBalance {
  createAccountBalanceData(data: AccountBalanceDto): Promise<any>;

  getAgentPnL(runtimeAgentId: string, forceRefresh?: boolean): Promise<any>;
  getAllAgentsPnL(forceRefresh?: boolean): Promise<any[]>;
  getBestPerformingAgent(): Promise<any>;
  getAgentPortfolio(runtimeAgentId: string): Promise<any>;

  getAgentBalanceHistory(agentId: string): Promise<any>;
  getAgentCurrentBalance(agentId: string): Promise<any>;

  // Get agent by database ID
  getAgentById(agentId: string): Promise<any | null>;
}

// Nouvelle interface pour le service de calcul du PnL
export interface IPnLCalculation {
  getAgentPnL(runtimeAgentId: string, forceRefresh?: boolean): Promise<any>;
  getAllAgentsPnL(forceRefresh?: boolean): Promise<any[]>;
}
