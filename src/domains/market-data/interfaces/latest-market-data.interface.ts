import { LatestMarketData } from "src/domains/leftcurve-agent/entities/leftcurve-agent.entity";

export interface ILatestMarketDataService {
  updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData>,
  ): Promise<LatestMarketData>;
}
