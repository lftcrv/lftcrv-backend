import { JsonValue } from '@prisma/client/runtime/library';
import { AgentStatus, CurveSide } from '@prisma/client';

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

export class AgentWallet {
  id: string;
  privateKey: string;
  publicKey: string;
  contractAddress: string;
  fundTransactionHash?: string;
  deployTransactionHash?: string;
  deployedAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  elizaAgentId: string;
}

export class ElizaAgent {
  id: string;
  name: string;
  curveSide: CurveSide;
  creatorWallet: string;
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
