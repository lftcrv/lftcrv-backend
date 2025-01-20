import { LatestMarketData } from '../../../domains/eliza-agent/entities/eliza-agent.entity';

export interface ILatestMarketDataService {
  updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData>,
  ): Promise<LatestMarketData>;
}
