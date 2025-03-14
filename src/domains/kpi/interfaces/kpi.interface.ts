import { AccountBalanceDto } from '../dtos/kpi.dto';

export interface IAccountBalance {
  createAccountBalanceData(
    data: AccountBalanceDto,
  ): Promise<any>;
  
  getAgentPnL(runtimeAgentId: string): Promise<any>;
  getAllAgentsPnL(): Promise<any[]>;
  getBestPerformingAgent(): Promise<any>;
}