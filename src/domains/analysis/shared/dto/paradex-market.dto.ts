
import { ApiProperty } from '@nestjs/swagger';

export class ParadexMarketDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'BTC-USD-PERP' })
  symbol: string;

  @ApiProperty({ example: 'BTC' })
  baseCurrency: string;

  @ApiProperty({ example: 'USD' })
  quoteCurrency: string;

  @ApiProperty({ example: 'PERP' })
  assetKind: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '10000' })
  positionLimit: string;

  @ApiProperty({ example: '10' })
  minNotional: string;
}

export class ParadexMarketsResponseDto {
  @ApiProperty({ example: 42 })
  count: number;

  @ApiProperty({ type: [ParadexMarketDto] })
  markets: ParadexMarketDto[];
}

export class ParadexSymbolsResponseDto {
  @ApiProperty({ example: 42 })
  count: number;

  @ApiProperty({ 
    type: [String],
    example: ['BTC-USD-PERP', 'ETH-USD-PERP']
  })
  symbols: string[];
}

export class RefreshMarketsResponseDto {
  @ApiProperty({ example: 'Markets updated successfully' })
  message: string;
}