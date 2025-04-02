import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class TokenBalanceDto {
  @ApiProperty({ example: 'ETH', description: 'Token symbol' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ example: 1.5, description: 'Token balance amount' })
  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @ApiProperty({ example: 3000, description: 'Token price in USD' })
  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Runtime Agent ID' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({ example: 1000, description: 'Balance amount in USD' })
  @IsNumber()
  @IsNotEmpty()
  balanceInUSD: number;

  @ApiProperty({ type: [TokenBalanceDto], description: 'Token balances' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceDto)
  @IsOptional()
  tokens?: TokenBalanceDto[];
}
