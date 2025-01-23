import { Injectable } from '@nestjs/common';
import {
  CrossoverResult,
  IMovingAverageService,
} from '../interfaces/moving-average.interface';

@Injectable()
export class MovingAverageService implements IMovingAverageService {
  calculateSMA(prices: number[], period: number): number[] {
    if (
      !prices ||
      prices.length === 0 ||
      prices.some((p) => typeof p !== 'number')
    ) {
      throw new Error('Invalid prices array');
    }
    if (period <= 0 || period > prices.length) {
      throw new Error('Invalid period');
    }

    const sma: number[] = [];
    let sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
    sma.push(sum / period);

    for (let i = period; i < prices.length; i++) {
      sum = sum - prices[i - period] + prices[i];
      sma.push(sum / period);
    }

    return sma;
  }

  calculateEMA(prices: number[], period: number): number[] {
    if (
      !prices ||
      prices.length === 0 ||
      prices.some((p) => typeof p !== 'number')
    ) {
      throw new Error('Invalid prices array');
    }
    if (period <= 0 || period > prices.length) {
      throw new Error('Invalid period');
    }

    const multiplier = 2 / (period + 1);
    const ema: number[] = [prices[0]]; // First EMA is same as first price

    for (let i = 1; i < prices.length; i++) {
      const value = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(value);
    }

    return ema;
  }

  detectCrossover(shortMA: number[], longMA: number[]): CrossoverResult {
    if (shortMA.length < 2 || longMA.length < 2) {
      throw new Error('Need at least 2 points to detect crossover');
    }

    const lastIndex = Math.min(shortMA.length, longMA.length) - 1;
    const prevIndex = lastIndex - 1;
    let type: 'bullish' | 'bearish' | null = null;

    // Bullish crossover: short MA crosses above long MA
    if (
      shortMA[prevIndex] <= longMA[prevIndex] &&
      shortMA[lastIndex] > longMA[lastIndex]
    ) {
      type = 'bullish';
    }

    // Bearish crossover: short MA crosses below long MA
    if (
      shortMA[prevIndex] >= longMA[prevIndex] &&
      shortMA[lastIndex] < longMA[lastIndex]
    ) {
      type = 'bearish';
    }

    return {
      type,
      index: lastIndex,
      shortMA: shortMA[lastIndex],
      longMA: longMA[lastIndex],
    };
  }
}
