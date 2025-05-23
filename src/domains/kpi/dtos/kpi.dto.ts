import {
  IsString,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  IsArray,
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
}

export class AccountBalanceDto {
  @ApiProperty({ description: 'Runtime Agent ID' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({ type: [TokenBalanceDto], description: 'Token balances' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceDto)
  @IsNotEmpty()
  tokens: TokenBalanceDto[];
}
