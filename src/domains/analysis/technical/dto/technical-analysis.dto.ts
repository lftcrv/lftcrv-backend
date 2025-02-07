import { ApiProperty } from '@nestjs/swagger';

// Short Term Analysis DTOs
export class ShortTermPatternDTO {
  @ApiProperty({
    enum: [
      'DOJI',
      'HAMMER',
      'ENGULFING_BULLISH',
      'ENGULFING_BEARISH',
      'MORNING_STAR',
      'THREE_WHITE_SOLDIERS',
    ],
  })
  type: string;

  @ApiProperty({ description: 'Pattern strength from 0 to 1' })
  strength: number;
}

export class PatternsDTO {
  @ApiProperty({ type: [ShortTermPatternDTO] })
  recent: ShortTermPatternDTO[];
}

export class RsiDTO {
  @ApiProperty()
  value: number;

  @ApiProperty({ enum: ['oversold', 'overbought', 'neutral'] })
  condition: 'oversold' | 'overbought' | 'neutral';
}

export class MacdDTO {
  @ApiProperty({ enum: ['buy', 'sell', 'neutral'] })
  signal: 'buy' | 'sell' | 'neutral';

  @ApiProperty()
  strength: number;
}

export class StochasticDTO {
  @ApiProperty({ description: '%K slow line' })
  k: number;

  @ApiProperty({ description: '%D fast line' })
  d: number;

  @ApiProperty({ enum: ['oversold', 'overbought', 'neutral'] })
  condition: 'oversold' | 'overbought' | 'neutral';
}

export class MomentumDTO {
  @ApiProperty({ type: () => RsiDTO })
  rsi: RsiDTO;

  @ApiProperty({ type: () => MacdDTO })
  macd: MacdDTO;

  @ApiProperty({ type: () => StochasticDTO })
  stochastic: StochasticDTO;
}

export class ShortTermAnalysisDTO {
  @ApiProperty({ example: '5m' })
  timeframe: string;

  @ApiProperty({ type: () => PatternsDTO })
  patterns: PatternsDTO;

  @ApiProperty({ type: () => MomentumDTO })
  momentum: MomentumDTO;
}

// Medium Term Analysis DTOs
export class RocDTO {
  @ApiProperty()
  value: number;

  @ApiProperty({ enum: ['oversold', 'overbought', 'neutral'] })
  state: 'oversold' | 'overbought' | 'neutral';

  @ApiProperty()
  period: number;
}

export class AdxDTO {
  @ApiProperty({ description: 'ADX value from 0 to 1' })
  value: number;

  @ApiProperty()
  trending: boolean;

  @ApiProperty()
  sustainedPeriods: number;
}

export class MediumTermMomentumDTO {
  @ApiProperty({ type: () => RocDTO })
  roc: RocDTO;

  @ApiProperty({ type: () => AdxDTO })
  adx: AdxDTO;
}

export class MomentumInfoDTO {
  @ApiProperty({ description: 'Value from -1 to 1' })
  value: number;

  @ApiProperty()
  period: number;

  @ApiProperty()
  sustainedPeriods: number;
}

export class TestedLevelsDTO {
  @ApiProperty()
  recent: number;

  @ApiProperty()
  count: number;
}

export class PriceActionDTO {
  @ApiProperty({ enum: ['uptrend', 'downtrend', 'sideways'] })
  direction: 'uptrend' | 'downtrend' | 'sideways';

  @ApiProperty({ description: 'Strength from 0 to 1' })
  strength: number;

  @ApiProperty({ type: () => TestedLevelsDTO })
  testedLevels: TestedLevelsDTO;
}

export class VolatilityDTO {
  @ApiProperty()
  bbWidth: number;

  @ApiProperty({ enum: ['expanding', 'contracting', 'stable'] })
  state: 'expanding' | 'contracting' | 'stable';
}

export class PriceDTO {
  @ApiProperty({ type: () => PriceActionDTO })
  action: PriceActionDTO;

  @ApiProperty({ type: () => VolatilityDTO })
  volatility: VolatilityDTO;
}

export class PrimaryTrendDTO {
  @ApiProperty({ enum: ['bullish', 'bearish', 'neutral'] })
  direction: 'bullish' | 'bearish' | 'neutral';

  @ApiProperty({ description: 'Trend strength from 0 to 1' })
  strength: number;

  @ApiProperty({ type: () => MomentumInfoDTO })
  momentum: MomentumInfoDTO;
}

export class MediumTermTrendDTO {
  @ApiProperty({ type: () => PrimaryTrendDTO })
  primary: PrimaryTrendDTO;

  @ApiProperty({ type: () => PriceDTO })
  price: PriceDTO;
}

export class IchimokuLinesDTO {
  @ApiProperty()
  conversion: number;

  @ApiProperty()
  base: number;

  @ApiProperty({ description: 'Distance from price to cloud in %' })
  priceDistance: number;
}

export class IchimokuDTO {
  @ApiProperty({
    enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'],
  })
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

  @ApiProperty({ enum: ['above', 'below', 'inside'] })
  cloudState: 'above' | 'below' | 'inside';

  @ApiProperty({ type: () => IchimokuLinesDTO })
  lines: IchimokuLinesDTO;
}

export class PivotsDTO {
  @ApiProperty()
  pivot: number;

  @ApiProperty()
  r1: number;

  @ApiProperty()
  s1: number;

  @ApiProperty({ enum: ['above_r1', 'below_s1', 'between'] })
  breakout: 'above_r1' | 'below_s1' | 'between';

  @ApiProperty({ description: 'Distance to R1 in %' })
  r1Distance: number;
}

export class VolumeProfileDTO {
  @ApiProperty({ enum: ['high', 'low', 'neutral'] })
  distribution: 'high' | 'low' | 'neutral';

  @ApiProperty({ description: 'Activity level from 0 to 1' })
  activity: number;

  @ApiProperty()
  sustainedPeriods: number;
}

export class VolumeAnalysisDTO {
  @ApiProperty({ enum: ['increasing', 'decreasing', 'stable'] })
  trend: 'increasing' | 'decreasing' | 'stable';

  @ApiProperty({ description: 'Volume significance from 0 to 1' })
  significance: number;

  @ApiProperty({ type: () => VolumeProfileDTO })
  profile: VolumeProfileDTO;
}

export class MediumTermTechnicalsDTO {
  @ApiProperty({ type: () => MediumTermMomentumDTO })
  momentum: MediumTermMomentumDTO;

  @ApiProperty({ type: () => IchimokuDTO })
  ichimoku: IchimokuDTO;

  @ApiProperty({ type: () => PivotsDTO })
  pivots: PivotsDTO;

  @ApiProperty({ type: () => VolumeAnalysisDTO })
  volume: VolumeAnalysisDTO;
}

export class MediumTermAnalysisDTO {
  @ApiProperty({ example: '1h' })
  timeframe: string;

  @ApiProperty({ type: () => MediumTermTrendDTO })
  trend: MediumTermTrendDTO;

  @ApiProperty({ type: () => MediumTermTechnicalsDTO })
  technicals: MediumTermTechnicalsDTO;
}

// Long Term Analysis DTO
export class LongTermAnalysisDTO {
  @ApiProperty({ example: '4h' })
  timeframe: string;

  @ApiProperty()
  support: number;

  @ApiProperty()
  resistance: number;
}

export class KeySignalsDTO {
  @ApiProperty({ type: () => ShortTermAnalysisDTO })
  shortTerm: ShortTermAnalysisDTO;

  @ApiProperty({ type: () => MediumTermAnalysisDTO })
  mediumTerm: MediumTermAnalysisDTO;

  @ApiProperty({ type: () => LongTermAnalysisDTO })
  longTerm: LongTermAnalysisDTO;
}

export class ChangesDTO {
  @ApiProperty({ description: '30 minutes price change', example: '+1.25%' })
  '30min': string;

  @ApiProperty({ description: '1 hour price change', example: '-0.50%' })
  '1h': string;

  @ApiProperty({ description: '4 hours price change', example: '+2.75%' })
  '4h': string;
}

export class AssetAnalysisDTO {
  @ApiProperty({ description: 'Latest price of the asset' })
  lastPrice: number;

  @ApiProperty({ type: () => ChangesDTO })
  changes: ChangesDTO;

  @ApiProperty({ type: () => KeySignalsDTO })
  keySignals: KeySignalsDTO;

  @ApiProperty({ description: 'Asset volatility', example: 0.15 })
  volatility: number;
}

export class MarketAnalysisDTO {
  @ApiProperty()
  timestamp: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'object',
      $ref: '#/components/schemas/AssetAnalysisDTO',
    },
  })
  analyses: Record<string, AssetAnalysisDTO>;
}

export class MarketAnalysisResponseDTO {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: () => MarketAnalysisDTO })
  data: MarketAnalysisDTO;
}
