export interface IQueryAgentToken {
  simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint>;
  simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint>;
}
