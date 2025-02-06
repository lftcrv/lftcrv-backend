import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

@Injectable()
export class PivotService {
  calculateLevels(prices: PriceDTO[]) {
    if (prices.length === 0) {
      throw new Error('Price data is required');
    }

    const lastPrice = prices[prices.length - 1];
    const { high, low, close } = lastPrice;

    if (high === undefined || low === undefined || close === undefined) {
      throw new Error(
        'Invalid price data: high, low, and close values are required',
      );
    }

    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low;
    const s1 = 2 * pp - high;

    return {
      pivot: pp,
      r1,
      s1,
      breakout: this.getBreakoutState(close, r1, s1),
      r1Distance: ((r1 - close) / close) * 100,
    };
  }

  private getBreakoutState(
    price: number,
    r1: number,
    s1: number,
  ): 'above_r1' | 'below_s1' | 'between' {
    const EPSILON = 0.00001; // Small precision buffer
    if (price >= r1 - EPSILON) {
      return 'above_r1';
    }
    if (price <= s1 + EPSILON) {
      return 'below_s1';
    }
    return 'between';
  }
}
