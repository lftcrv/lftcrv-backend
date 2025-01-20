import { ILatestMarketDataService } from './latest-market-data.interface';

export type { ILatestMarketDataService };

export const ServiceTokens = {
  ElizaAgentCreate: Symbol('ILatestMarketDataService'),
} as const;
