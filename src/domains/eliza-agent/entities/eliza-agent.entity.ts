import { JsonValue } from '@prisma/client/runtime/library';
import { AgentStatus, CurveSide } from '@prisma/client';
import { AgentWallet } from './agent-wallet.entity';

export { AgentStatus, CurveSide };

export class AgentToken {
  id: string;
  token: string;
  symbol: string;
  contractAddress: string;
  buyTax: number;
  sellTax: number;
  elizaAgentId: string;
}

export class ElizaAgent {
  id: string;
  name: string;
  curveSide: CurveSide;
  creatorWallet: string;
  deploymentFeesTxHash: string;
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
  token?: AgentToken;
  wallet?: AgentWallet;
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
