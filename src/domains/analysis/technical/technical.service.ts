import { Injectable } from '@nestjs/common';
import { PriceService } from './services/price.service';
import { MovingAverageService } from './services/moving-average.service';
import { CandlestickService } from './services/candlestick.service';
import { MomentumService } from './services/momentum.service';
import { PriceDTO } from './dto/price.dto';
import { MarketAnalysis, AssetAnalysis, ShortTermAnalysis, MediumTermAnalysis } from './types';

@Injectable()
export class TechnicalService {

  constructor(
    private readonly priceService: PriceService,
    private readonly maService: MovingAverageService,
    private readonly candlestickService: CandlestickService,
    private readonly momentumService: MomentumService,
  ) {}

  async analyzeMarkets(assets: string[]): Promise<MarketAnalysis> {

    const timestamp = Date.now();
    const analyses: Record<string, AssetAnalysis> = {};

    for (const asset of assets) {
      try {
        analyses[asset] = await this.analyzeAsset(asset);
      } catch (error) {
        console.error(`Error analyzing ${asset}:`, error);
      }
    }

    return {
      timestamp,
      analyses
    };
  }

  private async analyzeAsset(asset: string): Promise<AssetAnalysis> {
    // Récupérer les données sur différents timeframes
    const [shortTermPrices, mediumTermPrices, longTermPrices] = await Promise.all([
      this.priceService.getHistoricalPrices(asset, '5m', {
        limit: 100,
        priceKind: 'mark',
      }),
      this.priceService.getHistoricalPrices(asset, '1h', {
        limit: 48,
        priceKind: 'mark',
      }),
      this.priceService.getHistoricalPrices(asset, '1h', {
        limit: 30,
        priceKind: 'mark',
      })
    ]);

    const lastPrice = shortTermPrices[shortTermPrices.length - 1].close!;

    return {
      lastPrice,
      changes: this.calculateChanges(shortTermPrices, mediumTermPrices, longTermPrices),
      keySignals: {
        shortTerm: await this.analyzeShortTerm(shortTermPrices),
        mediumTerm: await this.analyzeMediumTerm(mediumTermPrices),
        longTerm: {
          timeframe: "4h",
          support: lastPrice * 0.95,
          resistance: lastPrice * 1.05
        }
      },
      volatility: this.calculateVolatility(shortTermPrices, 12)  // 1h de données en 5m
    };
  }

  private formatPriceChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  private calculateChanges(shortTermPrices: PriceDTO[], mediumTermPrices: PriceDTO[], longTermPrices: PriceDTO[]): AssetAnalysis['changes'] {
    const thirtyMinChange = this.calculatePriceChange(shortTermPrices, 6);  // 6 periods of 5 min
    const oneHourChange = this.calculatePriceChange(mediumTermPrices, 1);   // 1 period of 1h
    const fourHourChange = this.calculatePriceChange(longTermPrices, 1);    // 1 period of 4h

    return {
      '30min': this.formatPriceChange(thirtyMinChange),
      '1h': this.formatPriceChange(oneHourChange),
      '4h': this.formatPriceChange(fourHourChange)
    };
  }

  private calculatePriceChange(prices: PriceDTO[], periods: number): number {
    const currentPrice = prices[prices.length - 1].close!;
    const previousPrice = prices[prices.length - 1 - periods]?.close ?? prices[0].close!;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  private async analyzeShortTerm(prices: PriceDTO[]): Promise<ShortTermAnalysis> {
    const patterns = this.candlestickService.analyzeCandlestick(prices)
      .slice(0, 2)
      .map(pattern => ({
        type: pattern.type,
        strength: pattern.strength
      }));

    const rsi = this.momentumService.calculateRSI(prices);
    const macd = this.momentumService.calculateMACD(prices);
    const stoch = this.momentumService.calculateStochastic(prices);
    
    const lastRSI = rsi[rsi.length - 1];
    const lastIndex = macd.histogram.length - 1;
    const currentPrice = prices[lastIndex].close!;
    
    // Get last stochastic values
    const lastK = stoch.k[stoch.k.length - 1];
    const lastD = stoch.d[stoch.d.length - 1];

    return {
      timeframe: "5m",
      patterns: {
        recent: patterns
      },
      momentum: {
        rsi: {
          value: lastRSI,
          condition: this.momentumService.getRSICondition(lastRSI)
        },
        macd: {
          signal: this.momentumService.getMACDSignal(
            macd.histogram[lastIndex],
            currentPrice
          ),
          strength: this.momentumService.getMACDStrength(
            macd.histogram[lastIndex],
            currentPrice
          )
        },
        stochastic: {
          k: lastK,
          d: lastD,
          condition: this.momentumService.getStochasticCondition(lastK, lastD)
        }
      }
    };
  }

  private async analyzeMediumTerm(prices: PriceDTO[]): Promise<MediumTermAnalysis> {
    const ema12 = this.maService.calculateEMA(prices, 12);
    const ema26 = this.maService.calculateEMA(prices, 26);
    const crossover = this.maService.detectCrossover(ema12, ema26);
    
    return {
      timeframe: "1h",
      trend: {
        direction: this.getTrendDirection(crossover, prices),
        crossover: crossover.type ? 
          `${crossover.type} at ${crossover.shortMA.toFixed(2)}` : 
          null,
        strength: this.calculateTrendStrength(prices)
      }
    };
  }

  private getTrendDirection(
    crossover: any,
    prices: PriceDTO[]
  ): 'bullish' | 'bearish' | 'neutral' {
    if (crossover.type === 'bullish') return 'bullish';
    if (crossover.type === 'bearish') return 'bearish';
    
    // Si pas de crossover récent, regarder la tendance des prix
    const priceChange = this.calculatePriceChange(prices, 5);  // Sur 5 périodes
    if (priceChange > 1) return 'bullish';
    if (priceChange < -1) return 'bearish';
    return 'neutral';
  }

  private calculateTrendStrength(prices: PriceDTO[]): number {
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      const change = (prices[i].close! - prices[i-1].close!) / prices[i-1].close!;
      changes.push(change);
    }
    
    // Normaliser la force entre 0 et 1
    const avgChange = Math.abs(changes.reduce((a, b) => a + b, 0) / changes.length);
    return Math.min(avgChange * 100, 1);
  }

  private calculateVolatility(prices: PriceDTO[], periods: number): number {
    const returns = [];
    for (let i = 1; i < Math.min(periods, prices.length); i++) {
      returns.push(
        (prices[i].close! - prices[i-1].close!) / prices[i-1].close! * 100
      );
    }
    
    return parseFloat(Math.sqrt(
      returns.reduce((acc, ret) => acc + ret * ret, 0) / returns.length
    ).toFixed(2));
  }
}