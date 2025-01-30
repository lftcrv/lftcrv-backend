import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
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
    const closingPrices = prices.map(p => p.close!);
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < closingPrices.length; i++) {
      const change = closingPrices[i] - closingPrices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    const rsi: number[] = [];
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

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

  calculateMACD(
    prices: PriceDTO[],
    shortPeriod = 12,
    longPeriod = 26,
    signalPeriod = 9,
  ): MACDResult {
    const closingPrices = prices.map(p => p.close!);
    
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

    return { macd, signal, histogram };
  }

  calculateStochastic(
    prices: PriceDTO[],
    period: number = 14,
  ): StochasticResult {
    if (prices.length < period) {
      return { k: [], d: [] };
    }

    const k: number[] = [];
    // Calculate %K
    for (let i = period - 1; i < prices.length; i++) {
      const currentClose = prices[i].close!;
      const periodPrices = prices.slice(i - period + 1, i + 1);
      const lowestLow = Math.min(...periodPrices.map(p => p.low!));
      const highestHigh = Math.max(...periodPrices.map(p => p.high!));
      k.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
    }

    // Calculate %D (3-day SMA of %K)
    const d: number[] = [];
    for (let i = 2; i < k.length; i++) {
      const threeDay = k.slice(i - 2, i + 1);
      d.push(threeDay.reduce((sum, val) => sum + val, 0) / 3);
    }

    return { k, d };
  }
}