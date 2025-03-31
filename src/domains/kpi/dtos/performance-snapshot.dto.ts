import { ApiProperty } from '@nestjs/swagger';

export class PerformanceSnapshotDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: '2023-03-15T12:00:00Z' })
  timestamp: Date;

  @ApiProperty({ example: 1000.50 })
  balanceInUSD: number;

  @ApiProperty({ example: 250.75 })
  pnl: number;

  @ApiProperty({ example: 25.5 })
  pnlPercentage: number;

  @ApiProperty({ example: 120.30 })
  pnl24h: number;

  @ApiProperty({ example: 450.20 })
  pnlCycle: number;

  @ApiProperty({ example: 42 })
  tradeCount: number;

  @ApiProperty({ example: 2500.00 })
  tvl: number;

  @ApiProperty({ example: 2.75 })
  price: number;

  @ApiProperty({ example: 275000.00 })
  marketCap: number;
}

export class PerformanceSnapshotAggregateDto {
  @ApiProperty({ example: '2023-03-15T00:00:00Z' })
  day?: string;

  @ApiProperty({ example: '2023-03-13T00:00:00Z' })
  week?: string;

  @ApiProperty({ example: 1000.50 })
  balanceInUSD: number;

  @ApiProperty({ example: 250.75 })
  pnl: number;

  @ApiProperty({ example: 25.5 })
  pnlPercentage: number;

  @ApiProperty({ example: 120.30 })
  pnl24h: number;

  @ApiProperty({ example: 450.20 })
  pnlCycle: number;

  @ApiProperty({ example: 42 })
  tradeCount: number;

  @ApiProperty({ example: 2500.00 })
  tvl: number;

  @ApiProperty({ example: 2.75 })
  price: number;

  @ApiProperty({ example: 275000.00 })
  marketCap: number;
}

export class PerformanceHistoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: 'daily', enum: ['hourly', 'daily', 'weekly'] })
  interval: string;

  @ApiProperty({ type: [PerformanceSnapshotDto], isArray: true })
  snapshots: PerformanceSnapshotDto[] | PerformanceSnapshotAggregateDto[];
} 