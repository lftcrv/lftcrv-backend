import {
  IsString,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TokenBalanceDto {
  @ApiProperty({ example: 'ETH', description: 'Token symbol' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ example: 1.5, description: 'Token balance amount' })
  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @ApiProperty({
    example: 2000,
    description:
      'Token price (optional - will be fetched from TokenMaster if not provided)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: true,
    description: 'Whether the price is valid (optional)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  hasValidPrice?: boolean;
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Runtime Agent ID' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({
    example: 3000,
    description: 'Total balance in USD (optional - will be calculated dynamically)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  balanceInUSD?: number;

  @ApiProperty({ type: [TokenBalanceDto], description: 'Token balances' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceDto)
  @IsNotEmpty()
  tokens: TokenBalanceDto[];
}
