import { ApiProperty } from '@nestjs/swagger';

export class CreatorLeaderboardEntryDto {
  @ApiProperty({
    description: 'Creator wallet address',
    example:
      '0x046494be4b665b6182152e656d5eae6ec9dc8e8d8870851f11422fff1457736a',
  })
  creatorId: string;

  @ApiProperty({
    description: 'Total number of agents created by this creator',
    example: 3,
  })
  totalAgents: number;

  @ApiProperty({
    description: 'Number of agents in RUNNING status',
    example: 2,
  })
  runningAgents: number;

  @ApiProperty({
    description: 'Total USD balance across all agents',
    example: 15000.5,
  })
  totalBalanceInUSD: number;

  @ApiProperty({
    description: 'Aggregated PnL for the current cycle across all agents',
    example: 2500.75,
  })
  aggregatedPnlCycle: number;

  @ApiProperty({
    description: 'Aggregated 24-hour PnL across all agents',
    example: 750.25,
  })
  aggregatedPnl24h: number;

  @ApiProperty({
    description: 'Total number of trades executed by all agents of this creator',
    example: 1500,
  })
  totalTradeCount: number;

  @ApiProperty({
    description: 'ID of the best performing agent by PnL cycle',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  bestAgentId?: string;

  @ApiProperty({
    description: 'PnL cycle of the best performing agent',
    example: 1250.5,
    required: false,
  })
  bestAgentPnlCycle?: number;

  @ApiProperty({
    description: 'Timestamp when the leaderboard data was last updated',
    example: '2023-04-30T14:30:00Z',
  })
  updatedAt: Date;
}
