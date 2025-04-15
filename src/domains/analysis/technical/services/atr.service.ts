import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

@Injectable()
export class ATRService {
  calculateATR(prices: PriceDTO[], period: number = 14): number[] {
    const trueRanges: number[] = [];

    // Calculate True Range series
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i].high!;
      const low = prices[i].low!;
      const prevClose = prices[i - 1].close!;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      );
      trueRanges.push(tr);
    }

    // Calculate ATR using EMA or Wilder's smoothing
    const atr: number[] = [];
    if (trueRanges.length > 0) {
      // First ATR is simply the first TR
      atr.push(trueRanges[0]);

      // Wilder's smoothing
      for (let i = 1; i < trueRanges.length; i++) {
        atr.push((atr[i - 1] * (period - 1) + trueRanges[i]) / period);
      }
    }

    return atr;
  }

  // Calculate normalized ATR (ATR as percentage of price)
  calculateNormalizedATR(prices: PriceDTO[], period: number = 14): number[] {
    const atr = this.calculateATR(prices, period);
    const normalizedATR: number[] = [];

    for (let i = 0; i < atr.length; i++) {
      const price = prices[i + 1].close!;
      normalizedATR.push((atr[i] / price) * 100);
    }

    return normalizedATR;
  }

  getVolatilitySignal(atr: number, avgATR: number): 'high' | 'normal' | 'low' {
    if (atr > avgATR * 1.5) return 'high';
    if (atr < avgATR * 0.5) return 'low';
    return 'normal';
  }
}
