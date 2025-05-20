import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTokenMasterDto {
  @ApiProperty({ description: 'Canonical symbol of the token', example: 'BTC' })
  @IsString()
  @IsNotEmpty()
  canonicalSymbol: string;

  @ApiProperty({
    description: 'Chain ID where the token exists',
    example: 'ethereum',
  })
  @IsString()
  @IsNotEmpty()
  chainID: string;

  @ApiProperty({ description: 'Symbol used on DexScreener', example: 'WBTC' })
  @IsString()
  @IsNotEmpty()
  dexScreenerSymbol: string;

  @ApiProperty({
    description: 'Contract address of the token',
    example: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  })
  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @ApiProperty({
    description: 'Quote symbol found for pricing',
    example: 'USDC',
  })
  @IsString()
  @IsNotEmpty()
  foundQuoteSymbol: string;

  @ApiPropertyOptional({
    description: 'Current price in USD',
    example: 60000.75,
    type: 'number',
    format: 'float',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceUSD?: number;

  @ApiProperty({
    description: 'Method or source of how the token data was found/verified',
    example: 'WBTC/USDC on ETH',
  })
  @IsString()
  @IsNotEmpty()
  method: string;
}

export class CreateBatchTokenMasterDto {
  @ApiProperty({ type: [CreateTokenMasterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateTokenMasterDto)
  tokens: CreateTokenMasterDto[];
}
