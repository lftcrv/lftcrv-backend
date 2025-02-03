// ===============================
// Basic Types and Enums
// ===============================

import { PriceDTO } from './dto/price.dto';

export type TimeFrame = '1m' | '3m' | '5m' | '15m' | '30m' | '1h';

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

export enum CandlePatternType {
  DOJI = 'DOJI',
  HAMMER = 'HAMMER',
  ENGULFING_BULLISH = 'ENGULFING_BULLISH',
  ENGULFING_BEARISH = 'ENGULFING_BEARISH',
  MORNING_STAR = 'MORNING_STAR',
  THREE_WHITE_SOLDIERS = 'THREE_WHITE_SOLDIERS',
}

// ===============================
// Technical Indicator Interfaces
// ===============================

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  width: number[];
  standardDeviation: number;
}

export interface CrossoverResult {
  type: 'bullish' | 'bearish' | null;
  index: number;
  shortMA: number;
  longMA: number;
}

export interface Pattern {
  type: CandlePatternType;
  strength: number;
}

// ===============================
// Service Interfaces
// ===============================

export interface IMovingAverageService {
  calculateSMA(prices: PriceDTO[], period: number): number[];
  calculateEMA(prices: PriceDTO[], period: number): number[];
  detectCrossover(shortMA: number[], longMA: number[]): CrossoverResult;
}

// ===============================
// Analysis Result Types
// ===============================

export interface AnalysisError {
  symbol: string;
  message: string;
  code?: string;
}

/**
 * Top-level market analysis containing results for multiple assets
 */
export interface MarketAnalysis {
  timestamp: number;
  analyses: Record<string, AssetAnalysis>;
  failed?: AnalysisError[];
}

/**
 * Complete analysis for a single asset
 */
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

/**
 * Short-term (5m) technical analysis
 */
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
    stochastic: {
      k: number;
      d: number;
      condition: 'oversold' | 'overbought' | 'neutral';
    };
  };
}

/**
 * Medium-term (1h) technical analysis
 */
export interface MediumTermAnalysis {
  timeframe: string;
  trend: MediumTermTrend;
  technicals: MediumTermTechnicals;
}

interface MediumTermTrend {
  primary: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    momentum: {
      value: number;
      period: number;
      sustainedPeriods: number;
    };
  };
  price: {
    action: {
      direction: 'uptrend' | 'downtrend' | 'sideways';
      strength: number;
      testedLevels: {
        recent: number;
        count: number;
      };
    };
    volatility: {
      bbWidth: number;
      state: 'expanding' | 'contracting' | 'stable';
    };
  };
}

interface MediumTermTechnicals {
  momentum: {
    roc: {
      value: number;
      state: 'oversold' | 'overbought' | 'neutral';
      period: number;
    };
    adx: {
      value: number;
      trending: boolean;
      sustainedPeriods: number;
    };
  };
  ichimoku: {
    signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    cloudState: 'above' | 'below' | 'inside';
    lines: {
      conversion: number;
      base: number;
      priceDistance: number;
    };
  };
  levels: {
    pivots: {
      pivot: number;
      r1: number;
      s1: number;
      breakout: 'above_r1' | 'below_s1' | 'between';
      r1Distance: number;
    };
  };
  volume: {
    trend: 'increasing' | 'decreasing' | 'stable';
    significance: number;
    profile: {
      distribution: 'high' | 'low' | 'neutral';
      activity: number;
      sustainedPeriods: number;
    };
  };
}

/**
 * Long-term (4h) technical analysis
 */
export interface LongTermAnalysis {
  timeframe: '4h';
  support: number;
  resistance: number;
}
