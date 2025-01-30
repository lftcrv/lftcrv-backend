import { PriceDTO } from './dto/price.dto';

export enum IndicatorType {
  SMA = 'SMA',
  EMA = 'EMA',
  RSI = 'RSI',
  MACD = 'MACD',
  STOCHASTIC = 'STOCHASTIC',
  OBV = 'OBV',
  BOLLINGER = 'BOLLINGER',
  ATR = 'ATR',
  ADX = 'ADX',
}

// Available timeframes for candle data
export type TimeFrame = '1m' | '3m' | '5m' | '15m' | '30m' | '1h';

// export type TechnicalAnalysisData = {
//   raw: {
//     patterns: Array<{
//       type: string;
//       position: number;
//       strength: number;
//       candlesData: Array<{
//         timestamp: number;
//         open: number;
//         high: number;
//         low: number;
//         close: number;
//         volume: number;
//       }>;
//     }>;
//     movingAverages: {
//       sma: number[];
//       ema: number[];
//       crossover: {
//         type: string | null;
//         index: number;
//         shortMA: number;
//         longMA: number;
//       };
//     };
//     momentum: {
//       rsi: number[];
//       macd: {
//         macd: number[];
//         signal: number[];
//         histogram: number[];
//       };
//     };
//     volume: {
//       obv: number[];
//       profile: Record<string, any>;
//     };
//     levels: number[];
//   };
//   signals: {
//     momentum: {
//       rsi: {
//         value: number;
//         signal: string;
//       };
//       macd: {
//         trend: string;
//         strength: number;
//       };
//     };
//     trend: {
//       direction: string;
//       strength: number;
//       keyLevels: number[];
//     };
//     volume: {
//       trend: string;
//       significance: number;
//     };
//   };
//   prices: Array<{
//     timestamp: number;
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//     volume: number;
//   }>;
// };

// export interface TechnicalSignals {
//   momentum: {
//     rsi: {
//       value: number;
//       signal: 'oversold' | 'overbought' | 'neutral';
//     };
//     macd: {
//       trend: 'bullish' | 'bearish' | 'neutral';
//       strength: number;
//     };
//   };
//   trend: {
//     direction: 'up' | 'down' | 'sideways';
//     strength: number;
//     keyLevels: number[];
//   };
//   volume: {
//     trend: 'increasing' | 'decreasing' | 'neutral';
//     significance: number;
//   };
// }

// Moving Average types
export interface CrossoverResult {
  type: 'bullish' | 'bearish' | null;
  index: number;
  shortMA: number;
  longMA: number;
}

export interface IMovingAverageService {
  calculateSMA(prices: PriceDTO[], period: number): number[];
  calculateEMA(prices: PriceDTO[], period: number): number[];
  detectCrossover(shortMA: number[], longMA: number[]): CrossoverResult;
}

// Enum for candlestick pattern types
export enum CandlePatternType {
  DOJI = 'DOJI',
  HAMMER = 'HAMMER',
  ENGULFING_BULLISH = 'ENGULFING_BULLISH',
  ENGULFING_BEARISH = 'ENGULFING_BEARISH',
  MORNING_STAR = 'MORNING_STAR',
  THREE_WHITE_SOLDIERS = 'THREE_WHITE_SOLDIERS',
}

export interface MarketAnalysis {
  timestamp: number;
  analyses: Record<string, AssetAnalysis>;
}

export interface AssetAnalysis {
  lastPrice: number;
  changes: {
    '30min': string;
    '1h': string;
    '4h': string;
  };
  keySignals: {
    shortTerm: ShortTermAnalysis;
    mediumTerm: MediumTermAnalysis;
    longTerm: LongTermAnalysis;
  };
  volatility: number;
}

export interface Pattern {
  type: CandlePatternType;
  strength: number;
}

export interface ShortTermAnalysis {
  timeframe: '5m';
  patterns: {
    recent: Pattern[];
  };
  momentum: {
    rsi: {
      value: number;
      condition: 'oversold' | 'overbought' | 'neutral';
    };
    macd: {
      signal: 'buy' | 'sell' | 'neutral';
      strength: number;
    };
  };
}

export interface MediumTermAnalysis {
  timeframe: '1h';
  trend: {
    direction: 'bullish' | 'bearish' | 'neutral';
    crossover: string | null;
    strength: number;
  };
}

export interface LongTermAnalysis {
  timeframe: '4h';
  support: number;
  resistance: number;
}
