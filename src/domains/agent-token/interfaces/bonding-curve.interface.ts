export interface IBondingCurveService {
  getBondingCurvePercentage(agentTokenId: string): Promise<number>;
}
