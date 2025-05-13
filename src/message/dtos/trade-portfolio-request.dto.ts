import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class TradePortfolioRequestDto {
  @ApiProperty({
    description: 'Runtime ID of the agent',
    example: 'agent-123456',
  })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({
    description: 'Delay in milliseconds between trade request and portfolio request',
    example: 20000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  delayBetweenRequests?: number;
} 