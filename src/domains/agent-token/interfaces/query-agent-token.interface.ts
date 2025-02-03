export interface IQueryAgentToken {
  simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint>;
  getCurrentPrice(agentId: string): Promise<bigint>;
  simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint>;
  bondingCurvePercentage(agentId: string): Promise<number>;
}
