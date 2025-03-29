import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsInt } from 'class-validator';
import { BondingStatus } from '@prisma/client';

export class UpdateMarketDataDto {
  @ApiProperty({ 
    description: 'Current token price',
    example: 0.5,
    required: false
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ 
    description: '24-hour price change percentage',
    example: 5.25,
    required: false
  })
  @IsNumber()
  @IsOptional()
  priceChange24h?: number;

  @ApiProperty({ 
    description: 'Number of token holders',
    example: 100,
    required: false
  })
  @IsInt()
  @IsOptional()
  holders?: number;

  @ApiProperty({ 
    description: 'Market capitalization',
    example: 50000,
    required: false
  })
  @IsNumber()
  @IsOptional()
  marketCap?: number;

  @ApiProperty({ 
    description: 'Bonding status',
    enum: BondingStatus,
    example: BondingStatus.BONDING,
    required: false
  })
  @IsEnum(BondingStatus)
  @IsOptional()
  bondingStatus?: BondingStatus;

  @ApiProperty({ 
    description: 'Number of times this agent has been forked',
    example: 5,
    required: false
  })
  @IsInt()
  @IsOptional()
  forkCount?: number;

  @ApiProperty({ 
    description: 'Profit/loss for the current trading cycle',
    example: 123.45,
    required: false
  })
  @IsNumber()
  @IsOptional()
  pnlCycle?: number;

  @ApiProperty({ 
    description: 'Profit/loss for the last 24 hours',
    example: 45.67,
    required: false
  })
  @IsNumber()
  @IsOptional()
  pnl24h?: number;

  @ApiProperty({ 
    description: 'Total number of trades executed',
    example: 42,
    required: false
  })
  @IsInt()
  @IsOptional()
  tradeCount?: number;

  @ApiProperty({ 
    description: 'Total value locked/under management',
    example: 10000.00,
    required: false
  })
  @IsNumber()
  @IsOptional()
  tvl?: number;
} 