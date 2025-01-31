import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
  normalized: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
}

interface StochasticResult {
  k: number[]; // Fast stochastic
  d: number[]; // Slow stochastic
}

@Injectable()
export class MomentumService {
  calculateRSI(prices: PriceDTO[], period: number = 14): number[] {
    if (prices.length < period + 1) {
      return [];
    }

    // Extract closing prices
    const closingPrices = prices.map((p) => p.close!);
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < closingPrices.length; i++) {
      const change = closingPrices[i] - closingPrices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    const rsi: number[] = [];
    let avgGain =
      gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss =
      losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate initial RSI
    rsi.push(100 - 100 / (1 + avgGain / avgLoss));

    // Calculate subsequent RSI values
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      rsi.push(100 - 100 / (1 + avgGain / avgLoss));
    }

    return rsi;
  }

  getRSICondition(rsi: number): 'oversold' | 'overbought' | 'neutral' {
    if (rsi >= 70) return 'overbought';
    if (rsi <= 30) return 'oversold';
    return 'neutral';
  }

  calculateMACD(
    prices: PriceDTO[],
    shortPeriod = 12,
    longPeriod = 26,
    signalPeriod = 9,
  ): MACDResult {
    const closingPrices = prices.map((p) => p.close!);

    const getEMA = (data: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const ema: number[] = [data[0]];
      for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
      }
      return ema;
    };

    const shortEMA = getEMA(closingPrices, shortPeriod);
    const longEMA = getEMA(closingPrices, longPeriod);
    const macd: number[] = [];

    // Calculate MACD line
    for (let i = 0; i < closingPrices.length; i++) {
      macd.push(shortEMA[i] - longEMA[i]);
    }

    // Calculate signal line (9-day EMA of MACD)
    const signal = getEMA(macd, signalPeriod);

    // Calculate histogram
    const histogram = macd.map((value, i) => value - signal[i]);

    // Calculate normalized values (as percentage of price)
    const normalized = {
      macd: macd.map((value, i) => (value / closingPrices[i]) * 100),
      signal: signal.map((value, i) => (value / closingPrices[i]) * 100),
      histogram: histogram.map((value, i) => (value / closingPrices[i]) * 100),
    };

    return { macd, signal, histogram, normalized };
  }

  calculateStochastic(
    prices: PriceDTO[],
    period: number = 14, // %K Length
    dPeriod: number = 3, // %D Smoothing
  ): StochasticResult {
    if (prices.length < period) {
      return { k: [], d: [] };
    }

    const k: number[] = [];
    // Calculate raw %K
    for (let i = period - 1; i < prices.length; i++) {
      const currentClose = prices[i].close!;
      const periodPrices = prices.slice(i - period + 1, i + 1);
      const lowestLow = Math.min(...periodPrices.map((p) => p.low!));
      const highestHigh = Math.max(...periodPrices.map((p) => p.high!));
      k.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
    }

    // Calculate %D (3-period SMA of %K)
    const d: number[] = [];
    for (let i = dPeriod - 1; i < k.length; i++) {
      const dValues = k.slice(i - dPeriod + 1, i + 1);
      d.push(dValues.reduce((sum, val) => sum + val, 0) / dPeriod);
    }
    return { k, d };
  }

  // Helper methods for interpreting results
  getMACDSignal(histogram: number, price: number): 'buy' | 'sell' | 'neutral' {
    const normalizedHistogram = (histogram / price) * 100;

    if (normalizedHistogram > 0.2) return 'buy';
    if (normalizedHistogram < -0.2) return 'sell';
    return 'neutral';
  }

  getMACDStrength(histogram: number, price: number): number {
    const normalizedHistogram = Math.abs((histogram / price) * 100);
    return Math.min(normalizedHistogram / 0.4, 1); // Maximal strength at 0.4% of price
  }

  getStochasticCondition(
    k: number,
    d: number,
  ): 'oversold' | 'overbought' | 'neutral' {
    // Standard condition
    if (k > 80 && d > 80) return 'overbought';
    if (k < 20 && d < 20) return 'oversold';
    return 'neutral';
  }

  calculateROC(
    prices: PriceDTO[],
    period: number = 14,
  ): {
    values: number[];
    normalized: number[];
  } {
    if (prices.length < period + 1) {
      return { values: [], normalized: [] };
    }

    const closePrices = prices.map((p) => p.close!);
    const roc: number[] = [];
    const normalized: number[] = [];

    // Calculate ROC starting from the period index
    for (let i = period; i < closePrices.length; i++) {
      const currentPrice = closePrices[i];
      const oldPrice = closePrices[i - period];
      const rocValue = ((currentPrice - oldPrice) / oldPrice) * 100;
      roc.push(rocValue);

      // Normalize to [-1, 1] range, assuming ±10% as max typical range
      normalized.push(Math.max(Math.min(rocValue / 10, 1), -1));
    }

    return { values: roc, normalized };
  }

  getROCSignal(
    roc: number,
    overboughtThreshold: number = 10,
    oversoldThreshold: number = -10,
  ): {
    condition: 'overbought' | 'oversold' | 'neutral';
    strength: number;
  } {
    const absRoc = Math.abs(roc);
    const strength = Math.min(absRoc / 10, 1); // Normalize to [0, 1]

    if (roc > overboughtThreshold) {
      return { condition: 'overbought', strength };
    }
    if (roc < oversoldThreshold) {
      return { condition: 'oversold', strength };
    }
    return { condition: 'neutral', strength };
  }

  calculateSustainedPeriods(
    values: number[],
    threshold: number,
    direction: 'up' | 'down',
  ): number {
    let periods = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (direction === 'up' && values[i] > threshold) {
        periods++;
      } else if (direction === 'down' && values[i] < threshold) {
        periods++;
      } else {
        break;
      }
    }
    return periods;
  }
}
