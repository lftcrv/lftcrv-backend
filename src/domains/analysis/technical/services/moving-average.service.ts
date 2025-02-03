import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';
import {
  BollingerBandsResult,
  CrossoverResult,
  IMovingAverageService,
} from '../types';

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

  calculateBollingerBands(
    prices: PriceDTO[],
    period: number = 20,
    stdDev: number = 2,
  ): BollingerBandsResult {
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

    const middle = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    const width: number[] = [];

    // Calculate standard deviation and bands
    for (let i = period - 1; i < closePrices.length; i++) {
      const slice = closePrices.slice(i - period + 1, i + 1);
      const avg = middle[i - (period - 1)];
      const squaredDiffs = slice.map((price) => Math.pow(price - avg, 2));
      const variance =
        squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
      const standardDeviation = Math.sqrt(variance);

      const upperBand = avg + standardDeviation * stdDev;
      const lowerBand = avg - standardDeviation * stdDev;

      upper.push(upperBand);
      lower.push(lowerBand);
      width.push((upperBand - lowerBand) / avg); // Normalized width
    }

    return {
      upper,
      middle,
      lower,
      width,
      standardDeviation: stdDev,
    };
  }

  getBollingerBandPosition(
    price: number,
    upper: number,
    lower: number,
  ): 'above' | 'below' | 'inside' {
    if (price > upper) return 'above';
    if (price < lower) return 'below';
    return 'inside';
  }

  getBollingerBandWidth(upper: number, lower: number, middle: number): number {
    return (upper - lower) / middle;
  }
}
