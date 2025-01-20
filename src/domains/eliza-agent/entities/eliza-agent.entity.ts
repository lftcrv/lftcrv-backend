import { JsonValue } from '@prisma/client/runtime/library';
import { AgentStatus, CurveSide } from '@prisma/client';

export { AgentStatus, CurveSide };
export class ElizaAgent {
  id: string;
  name: string;
  curveSide: CurveSide;
  status: AgentStatus;
  containerId?: string;
  runtimeAgentId?: string;
  port?: number;
  characterConfig: JsonValue;
  createdAt: Date;
  updatedAt: Date;
  degenScore?: number;
  winScore?: number;
  latestMarketData?: LatestMarketData;
  tradingInformation?: TradingInformation[];
}

export class LatestMarketData {
  id: string;
  elizaAgentId: string;
  price: number;
  priceChange24h: number;
  holders: number;
  marketCap: number;
  updatedAt: Date;
  createdAt: Date;
}

export class TradingInformation {
  id: string;
  elizaAgentId: string;
  information: JsonValue;
  createdAt: Date;
}
