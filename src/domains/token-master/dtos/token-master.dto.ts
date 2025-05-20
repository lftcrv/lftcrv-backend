import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenMasterDto {
  @ApiProperty({
    description: 'Unique identifier of the token master record',
    example: 'clxovq6p0000008l3fgh01234',
  })
  id: string;

  @ApiProperty({ description: 'Canonical symbol of the token', example: 'BTC' })
  canonicalSymbol: string;

  @ApiProperty({
    description: 'Chain ID where the token exists',
    example: 'ethereum',
  })
  chainID: string;

  @ApiProperty({ description: 'Symbol used on DexScreener', example: 'WBTC' })
  dexScreenerSymbol: string;

  @ApiProperty({
    description: 'Contract address of the token',
    example: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  })
  contractAddress: string;

  @ApiProperty({
    description: 'Quote symbol found for pricing',
    example: 'USDC',
  })
  foundQuoteSymbol: string;

  @ApiPropertyOptional({
    description: 'Current price in USD',
    example: 60000.75,
    type: 'number',
    format: 'float',
    nullable: true,
  })
  priceUSD?: number | null;

  @ApiProperty({
    description: 'Method or source of how the token data was found/verified',
    example: 'WBTC/USDC on ETH',
  })
  method: string;

  @ApiProperty({ description: 'Timestamp of creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last update' })
  updatedAt: Date;
}
