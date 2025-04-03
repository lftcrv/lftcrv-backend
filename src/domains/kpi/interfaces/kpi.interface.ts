import { AccountBalanceDto } from '../dtos/kpi.dto';

export interface IAccountBalance {
  createAccountBalanceData(data: AccountBalanceDto): Promise<any>;

  getAgentPnL(runtimeAgentId: string): Promise<any>;
  getAllAgentsPnL(): Promise<any[]>;
  getBestPerformingAgent(): Promise<any>;
  getAgentPortfolio(runtimeAgentId: string): Promise<any>;

  getAgentBalanceHistory(agentId: string): Promise<any>;
  getAgentCurrentBalance(agentId: string): Promise<any>;
}
