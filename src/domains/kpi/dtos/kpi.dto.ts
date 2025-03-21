import { IsString, IsNumber, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

class BalanceData {
  @ApiProperty({ example: 1000, description: 'Balance amount in a specific currency' })
  @IsNumber()
  @IsNotEmpty()
  USD: number;

  @ApiProperty({ example: "2025-03-12T14:00:00Z", description: 'Last update timestamp' })
  @IsString()
  @IsNotEmpty()
  updatedAt: string;
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Runtime Agent ID' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({ example: 1000, description: 'Balance amount in USD' })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsNotEmpty()
  balanceInUSD: number;
}