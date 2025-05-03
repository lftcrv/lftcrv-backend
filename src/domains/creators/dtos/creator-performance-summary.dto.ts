import { ApiProperty } from '@nestjs/swagger';
import { CreatorPerformanceAgentDetailDto } from './creator-performance-agent-detail.dto';

export class CreatorPerformanceSummaryDto {
  @ApiProperty({
    description: 'Creator ID (Wallet Address)',
    example: '0x123abc...',
  })
  creatorId: string;

  @ApiProperty({
    description: 'Total number of agents managed by the creator',
    example: 10,
  })
  totalAgents: number;

  @ApiProperty({
    description: 'Number of currently RUNNING agents',
    example: 8,
  })
  runningAgents: number;

  @ApiProperty({
    description:
      'Aggregated Total Value Locked (TVL) across all agents with data',
    example: 50000.0,
    type: Number,
  })
  totalTvl: number;

  @ApiProperty({
    description: 'Aggregated Balance in USD across all agents with data',
    example: 35000.0,
    type: Number,
  })
  totalBalanceInUSD: number;

  @ApiProperty({
    description: 'Aggregated PnL (Cycle/Total) across all agents with data',
    example: 1250.75,
    type: Number,
  })
  totalPnlCycle: number;

  @ApiProperty({
    description: 'Aggregated PnL (24h) across all agents with data',
    example: 300.15,
    type: Number,
  })
  totalPnl24h: number;

  @ApiProperty({
    description: 'Total number of trades executed across all agents with data',
    example: 1200,
    type: Number,
  })
  totalTradeCount: number;

  @ApiProperty({
    description:
      'Agent with the highest PnL (Cycle/Total). Null if no agents have performance data.',
    type: () => CreatorPerformanceAgentDetailDto,
    required: false,
    nullable: true,
  })
  bestPerformingAgentPnlCycle?: CreatorPerformanceAgentDetailDto | null;

  @ApiProperty({
    description:
      'Detailed performance list for each agent associated with the creator.',
    type: [CreatorPerformanceAgentDetailDto],
  })
  agentDetails: CreatorPerformanceAgentDetailDto[];

  @ApiProperty({
    description: 'Timestamp of the latest data included in the summary',
    required: false,
  })
  lastUpdated?: Date;
}
