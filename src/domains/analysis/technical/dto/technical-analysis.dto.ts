import { ApiProperty } from '@nestjs/swagger';

export class ShortTermPatternDTO {
  @ApiProperty()
  type: string;

  @ApiProperty()
  strength: number;
}

export class PatternsDTO {
  @ApiProperty({ type: [ShortTermPatternDTO] })
  recent: ShortTermPatternDTO[];
}

export class MomentumRsiDTO {
  @ApiProperty()
  value: number;

  @ApiProperty({ enum: ['oversold', 'overbought', 'neutral'] })
  condition: 'oversold' | 'overbought' | 'neutral';
}

export class MomentumMacdDTO {
  @ApiProperty({ enum: ['buy', 'sell', 'neutral'] })
  signal: 'buy' | 'sell' | 'neutral';

  @ApiProperty()
  strength: number;
}

export class MomentumDTO {
  @ApiProperty()
  rsi: MomentumRsiDTO;

  @ApiProperty()
  macd: MomentumMacdDTO;
}

export class ShortTermAnalysisDTO {
  @ApiProperty()
  timeframe: string;

  @ApiProperty()
  patterns: PatternsDTO;

  @ApiProperty()
  momentum: MomentumDTO;
}

export class TrendDTO {
  @ApiProperty({ enum: ['bullish', 'bearish', 'neutral'] })
  direction: 'bullish' | 'bearish' | 'neutral';

  @ApiProperty({ nullable: true })
  crossover: string | null;

  @ApiProperty()
  strength: number;
}

export class MediumTermAnalysisDTO {
  @ApiProperty()
  timeframe: string;

  @ApiProperty()
  trend: TrendDTO;
}

export class LongTermAnalysisDTO {
  @ApiProperty()
  timeframe: string;

  @ApiProperty()
  support: number;

  @ApiProperty()
  resistance: number;
}

export class KeySignalsDTO {
  @ApiProperty()
  shortTerm: ShortTermAnalysisDTO;

  @ApiProperty()
  mediumTerm: MediumTermAnalysisDTO;

  @ApiProperty()
  longTerm: LongTermAnalysisDTO;
}

export class ChangesDTO {
  @ApiProperty({ description: '30 minutes price change' })
  '30min': string;

  @ApiProperty({ description: '1 hour price change' })
  '1h': string;

  @ApiProperty({ description: '4 hours price change' })
  '4h': string;
}

export class AssetAnalysisDTO {
  @ApiProperty({ description: 'Latest price of the asset' })
  lastPrice: number;

  @ApiProperty({
    description: 'Price changes over different timeframes',
    type: ChangesDTO,
  })
  changes: ChangesDTO;

  @ApiProperty({ description: 'Technical analysis signals' })
  keySignals: KeySignalsDTO;

  @ApiProperty({ description: 'Asset volatility' })
  volatility: number;
}

export class MarketAnalysisDTO {
  @ApiProperty()
  timestamp: number;

  @ApiProperty({ type: Object })
  analyses: Record<string, AssetAnalysisDTO>;
}

export class MarketAnalysisResponseDTO {
  @ApiProperty()
  status: string;

  @ApiProperty()
  data: MarketAnalysisDTO;
}
