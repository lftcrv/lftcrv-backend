import { JsonValue } from '@prisma/client/runtime/library';
import { AgentStatus, BondingStatus, CurveSide } from '@prisma/client';
import { AgentWallet } from './agent-wallet.entity';
import { ApiProperty } from '@nestjs/swagger';

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

export class TradingInformation {
  id: string;
  createdAt: Date;
  information: any;
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
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
  degenScore?: number;
  winScore?: number;
  latestMarketData?: LatestMarketData;
  tradingInformation?: TradingInformation[];
  token?: AgentToken;
  wallet?: AgentWallet;
  // Fork relationship fields
  forkedFromId?: string;
  forkedFrom?: ElizaAgent;
  forks?: ElizaAgent[];

  @ApiProperty({
    description: "URL to the agent's profile picture",
    required: false,
  })
  get profilePictureUrl(): string | null {
    if (!this.profilePicture) {
      return null;
    }
    return `/uploads/profile-pictures/${this.profilePicture}`;
  }

  constructor(partial: Partial<ElizaAgent>) {
    Object.assign(this, partial);
  }
}

export class LatestMarketData {
  id: string;
  elizaAgentId: string;
  price: number;
  priceChange24h: number;
  holders: number;
  marketCap: number;
  bondingStatus: BondingStatus;
  updatedAt: Date;
  createdAt: Date;
  // New performance metrics
  forkCount: number;
  pnlCycle: number;
  pnl24h: number;
  tradeCount: number;
  tvl: number;

  constructor(partial: Partial<LatestMarketData>) {
    Object.assign(this, partial);
  }
}
