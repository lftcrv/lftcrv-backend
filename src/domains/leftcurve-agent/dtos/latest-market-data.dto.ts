import { ApiProperty } from '@nestjs/swagger';
import { BondingStatus } from '@prisma/client';

export class LatestMarketDataDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Associated agent ID' })
  elizaAgentId: string;

  @ApiProperty({ description: 'Current token price' })
  price: number;

  @ApiProperty({ description: '24-hour price change percentage' })
  priceChange24h: number;

  @ApiProperty({ description: 'Number of token holders' })
  holders: number;

  @ApiProperty({ description: 'Market capitalization' })
  marketCap: number;

  @ApiProperty({ 
    description: 'Bonding status',
    enum: BondingStatus,
    example: BondingStatus.BONDING
  })
  bondingStatus: BondingStatus;

  // New performance metrics
  @ApiProperty({ 
    description: 'Number of times this agent has been forked',
    example: 5
  })
  forkCount: number;

  @ApiProperty({ 
    description: 'Profit/loss for the current trading cycle',
    example: 123.45
  })
  pnlCycle: number;

  @ApiProperty({ 
    description: 'Profit/loss for the last 24 hours',
    example: 45.67
  })
  pnl24h: number;

  @ApiProperty({ 
    description: 'Total number of trades executed',
    example: 42
  })
  tradeCount: number;

  @ApiProperty({ 
    description: 'Total value locked/under management',
    example: 10000.00
  })
  tvl: number;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
} 