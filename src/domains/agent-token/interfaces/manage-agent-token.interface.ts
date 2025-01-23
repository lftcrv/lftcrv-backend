export interface IManageAgentToken {
  buy(agentId: string, tokenAmount: bigint): Promise<bigint>;
  sell(agentId: string, tokenAmount: bigint): Promise<bigint>;
  simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint>;
  simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint>;
}
