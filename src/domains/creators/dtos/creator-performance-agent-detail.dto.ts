import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class CreatorPerformanceAgentDetailDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent-uuid-123' })
  id: string;

  @ApiProperty({ description: 'Agent Name', example: 'TradingBot Alpha' })
  name: string;

  @ApiProperty({
    description: 'Agent Status',
    enum: AgentStatus,
    example: AgentStatus.RUNNING,
  })
  status: AgentStatus;

  @ApiProperty({
    description: 'Agent Profile Picture filename',
    required: false,
    example: 'image.jpg',
  })
  profilePicture?: string;

  @ApiProperty({
    description: 'Full URL to agent profile picture',
    required: false,
    example: '/uploads/profile-pictures/image.jpg',
  })
  profilePictureUrl?: string | null;

  @ApiProperty({
    description: 'Token Symbol',
    required: false,
    example: 'AGENT',
  })
  symbol?: string;

  @ApiProperty({
    description: 'P&L Cycle Ranking',
    required: false,
    type: Number,
    example: 1,
  })
  pnlRank?: number | null;

  @ApiProperty({
    description: 'Number of times this agent has been forked',
    required: false,
    type: Number,
    example: 5,
  })
  forkCount?: number | null;

  @ApiProperty({
    description: 'Agent Current Balance in USD',
    example: 1500.5,
    required: false,
    type: Number,
    default: 0,
  })
  balanceInUSD?: number | null; // Use number | null to explicitly show potential absence

  @ApiProperty({
    description: 'Agent Current TVL',
    example: 2500.0,
    required: false,
    type: Number,
    default: 0,
  })
  tvl?: number | null;

  @ApiProperty({
    description:
      "Agent PnL (Cycle/Total) - Based on LatestMarketData's pnlCycle",
    example: 450.2,
    required: false,
    type: Number,
    default: 0,
  })
  pnlCycle?: number | null;

  @ApiProperty({
    description: "Agent PnL (24h) - Based on LatestMarketData's pnl24h",
    example: 50.1,
    required: false,
    type: Number,
    default: 0,
  })
  pnl24h?: number | null;

  @ApiProperty({
    description: "Agent Total Trades - Based on LatestMarketData's tradeCount",
    example: 150,
    required: false,
    type: Number,
    default: 0,
  })
  tradeCount?: number | null;

  @ApiProperty({
    description: "Agent Market Cap - Based on LatestMarketData's marketCap",
    example: 275000.0,
    required: false,
    type: Number,
    default: 0,
  })
  marketCap?: number | null;

  @ApiProperty({ description: 'Agent Creation Timestamp', required: false })
  createdAt?: Date;
}
