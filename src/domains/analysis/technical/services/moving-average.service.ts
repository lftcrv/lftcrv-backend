import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';
import { CrossoverResult, IMovingAverageService } from '../types';

@Injectable()
export class MovingAverageService implements IMovingAverageService {
  calculateSMA(prices: PriceDTO[], period: number): number[] {
    const closePrices = prices.map((p) => p.close!);

    if (
      !closePrices ||
      closePrices.length === 0 ||
      closePrices.some((p) => typeof p !== 'number')
    ) {
      throw new Error('Invalid prices array');
    }
    if (period <= 0 || period > closePrices.length) {
      throw new Error('Invalid period');
    }

    const sma: number[] = [];
    let sum = closePrices.slice(0, period).reduce((a, b) => a + b, 0);
    sma.push(sum / period);

    for (let i = period; i < closePrices.length; i++) {
      sum = sum - closePrices[i - period] + closePrices[i];
      sma.push(sum / period);
    }

    return sma;
  }

  calculateEMA(prices: PriceDTO[], period: number): number[] {
    const closePrices = prices.map((p) => p.close!);

    if (
      !closePrices ||
      closePrices.length === 0 ||
      closePrices.some((p) => typeof p !== 'number')
    ) {
      throw new Error('Invalid prices array');
    }
    if (period <= 0 || period > closePrices.length) {
      throw new Error('Invalid period');
    }

    const multiplier = 2 / (period + 1);
    const ema: number[] = [closePrices[0]]; // First EMA is same as first price

    for (let i = 1; i < closePrices.length; i++) {
      const value = (closePrices[i] - ema[i - 1]) * multiplier + ema[i - 1];
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
