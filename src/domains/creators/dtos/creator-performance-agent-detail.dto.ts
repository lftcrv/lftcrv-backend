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
    description: 'Agent Profile Picture URL',
    required: false,
    example: '/path/to/image.jpg',
  })
  profilePicture?: string;

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
