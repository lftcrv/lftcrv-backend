import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";

@Injectable()
export class IchimokuService {
  calculateSimplified(prices: PriceDTO[]) {
    const currentPrice = prices[prices.length - 1].close!;
  
    // compute the last (most recent) Tenkan, Kijun, SpanB,...
    const lastTenkan = this.calculateLastPeriodHL(prices, 9);
    const lastKijun = this.calculateLastPeriodHL(prices, 26);
    const lastSpanB = this.calculateLastPeriodHL(prices, 52);
  
    // Ichimoku "Span A" is the average of the last Tenkan and last Kijun
    const lastSpanA = (lastTenkan + lastKijun) / 2;
  
    const cloudTop = Math.max(lastSpanA, lastSpanB);
    const cloudBottom = Math.min(lastSpanA, lastSpanB);
  
    return {
      signal: this.getIchimokuSignal(
        currentPrice,
        lastTenkan,
        lastKijun,
        cloudTop,
        cloudBottom,
      ),
      cloudState: this.getCloudState(
        currentPrice,
        cloudTop,
        cloudBottom,
      ),
      lines: {
        conversion: lastTenkan,
        base: lastKijun,
        priceDistance: ((currentPrice - cloudTop) / currentPrice) * 100,
      },
    };
  }
  
  // A helper that calculates just the final “(highest high + lowest low)/2” 
  // over the given `period`.
  private calculateLastPeriodHL(prices: PriceDTO[], period: number): number {
    if (prices.length < period) {
      throw new Error('Not enough data');
    }
    const endIndex = prices.length - 1;
    const startIndex = endIndex - period + 1;
    const slice = prices.slice(startIndex, endIndex + 1);
  
    const high = Math.max(...slice.map(p => p.high!));
    const low = Math.min(...slice.map(p => p.low!));
    return (high + low) / 2;
  }

  private getIchimokuSignal(
    price: number,
    conversion: number,
    base: number,
    cloudTop: number,
    cloudBottom: number
  ): 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' {
    if (price > cloudTop && conversion > base) return 'strong_buy';
    if (price > cloudTop) return 'buy';
    if (price < cloudBottom && conversion < base) return 'strong_sell';
    if (price < cloudBottom) return 'sell';
    return 'neutral';
  }

  private getCloudState(
    price: number,
    cloudTop: number,
    cloudBottom: number
  ): 'above' | 'below' | 'inside' {
    if (price > cloudTop) return 'above';
    if (price < cloudBottom) return 'below';
    return 'inside';
  }
}