import { BadRequestException, Injectable } from '@nestjs/common';
import { PriceService } from './services/price.service';
import { MovingAverageService } from './services/moving-average.service';
import { CandlestickService } from './services/candlestick.service';
import { MomentumService } from './services/momentum.service';
import { PriceDTO } from './dto/price.dto';
import {
  MarketAnalysis,
  AssetAnalysis,
  ShortTermAnalysis,
  MediumTermAnalysis,
  AnalysisError,
} from './types';
import { ADXService } from './services/adx.service';
import { IchimokuService } from './services/ichimoku.service';
import { PivotService } from './services/pivot.service';
import { VolumeService } from './services/volume.service';
import { getAllSymbols } from '../shared/utils';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class TechnicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceService: PriceService,
    private readonly maService: MovingAverageService,
    private readonly candlestickService: CandlestickService,
    private readonly momentumService: MomentumService,
    private readonly adxService: ADXService,
    private readonly ichimokuService: IchimokuService,
    private readonly volumeService: VolumeService,
    private readonly pivotService: PivotService,
  ) {}

  private formatSymbol(asset: string): string {
    return asset.includes('-') ? asset : `${asset.toUpperCase()}-USD-PERP`;
  }

  async analyzeMarkets(assets: string[]): Promise<MarketAnalysis> {
    if (!assets || assets.length === 0) {
      throw new BadRequestException('No assets provided for analysis');
    }

    const timestamp = Date.now();
    const analyses: Record<string, AssetAnalysis> = {};
    const failed: AnalysisError[] = [];

    try {
      // Get all available Paradex symbols
      const availableSymbols = await getAllSymbols(this.prisma);
      const symbolsSet = new Set(availableSymbols);

      for (const asset of assets) {
        try {
          const formattedSymbol = this.formatSymbol(asset);

          // Check if the symbol exists in Paradex
          if (!symbolsSet.has(formattedSymbol)) {
            failed.push({
              symbol: formattedSymbol,
              message: 'Asset not available on Paradex',
              code: 'SYMBOL_NOT_FOUND',
            });
            continue;
          }

          analyses[asset] = await this.analyzeAsset(asset);
        } catch (error) {
          failed.push({
            symbol: asset,
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'ANALYSIS_FAILED',
          });
        }
      }

      // Si aucune analyse n'a réussi, on lance une erreur
      if (Object.keys(analyses).length === 0) {
        throw new BadRequestException({
          message: 'No assets could be analyzed',
          errors: failed,
        });
      }

      return {
        timestamp,
        analyses,
        ...(failed.length > 0 && { failed }), // n'inclut failed que s'il y a des erreurs
      };
    } catch (error) {
      // Si c'est une erreur déjà formatée (BadRequestException), on la relance
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Sinon on formate l'erreur
      throw new BadRequestException({
        message: 'Failed to analyze markets',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async analyzeAsset(asset: string): Promise<AssetAnalysis> {
    // Get data for different timeframes
    const [shortTermPrices, mediumTermPrices, longTermPrices] =
      await Promise.all([
        this.priceService.getHistoricalPrices(asset, '5m', {
          limit: 100,
          priceKind: 'mark',
        }),
        this.priceService.getHistoricalPrices(asset, '1h', {
          limit: 52,
          priceKind: 'mark',
        }),
        this.priceService.getHistoricalPrices(asset, '1h', {
          limit: 30,
          priceKind: 'mark',
        }),
      ]);

    const lastPrice = shortTermPrices[shortTermPrices.length - 1].close!;

    return {
      lastPrice,
      changes: this.calculateChanges(
        shortTermPrices,
        mediumTermPrices,
        longTermPrices,
      ),
      keySignals: {
        shortTerm: await this.analyzeShortTerm(shortTermPrices),
        mediumTerm: await this.analyzeMediumTerm(mediumTermPrices),
        longTerm: {
          timeframe: '4h',
          support: lastPrice * 0.95,
          resistance: lastPrice * 1.05,
        },
      },
      volatility: this.calculateVolatility(shortTermPrices, 12),
    };
  }

  private formatPriceChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  private calculateChanges(
    shortTermPrices: PriceDTO[],
    mediumTermPrices: PriceDTO[],
    longTermPrices: PriceDTO[],
  ): AssetAnalysis['changes'] {
    const thirtyMinChange = this.calculatePriceChange(shortTermPrices, 6);
    const oneHourChange = this.calculatePriceChange(mediumTermPrices, 1);
    const fourHourChange = this.calculatePriceChange(longTermPrices, 1);

    return {
      '30min': this.formatPriceChange(thirtyMinChange),
      '1h': this.formatPriceChange(oneHourChange),
      '4h': this.formatPriceChange(fourHourChange),
    };
  }

  private calculatePriceChange(prices: PriceDTO[], periods: number): number {
    const currentPrice = prices[prices.length - 1].close!;
    const previousPrice =
      prices[prices.length - 1 - periods]?.close ?? prices[0].close!;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }

  private async analyzeShortTerm(
    prices: PriceDTO[],
  ): Promise<ShortTermAnalysis> {
    if (prices.length < 26) {
      return this.getDefaultShortTermAnalysis();
    }

    const patterns = this.candlestickService
      .analyzeCandlestick(prices)
      .slice(0, 2)
      .map((pattern) => ({
        type: pattern.type,
        strength: pattern.strength,
      }));

    const rsi = this.momentumService.calculateRSI(prices);
    const macd = this.momentumService.calculateMACD(prices);
    const stoch = this.momentumService.calculateStochastic(prices);

    const lastRSI = rsi[rsi.length - 1];
    const lastIndex = macd.histogram.length - 1;
    const currentPrice = prices[lastIndex].close!;

    const lastK = stoch.k[stoch.k.length - 1];
    const lastD = stoch.d[stoch.d.length - 1];

    return {
      timeframe: '5m',
      patterns: {
        recent: patterns,
      },
      momentum: {
        rsi: {
          value: lastRSI,
          condition: this.momentumService.getRSICondition(lastRSI),
        },
        macd: {
          signal: this.momentumService.getMACDSignal(
            macd.histogram[lastIndex],
            currentPrice,
          ),
          strength: this.momentumService.getMACDStrength(
            macd.histogram[lastIndex],
            currentPrice,
          ),
        },
        stochastic: {
          k: lastK,
          d: lastD,
          condition: this.momentumService.getStochasticCondition(lastK, lastD),
        },
      },
    };
  }

  private getDefaultShortTermAnalysis(): ShortTermAnalysis {
    return {
      timeframe: '5m',
      patterns: {
        recent: [],
      },
      momentum: {
        rsi: {
          value: 50,
          condition: 'neutral',
        },
        macd: {
          signal: 'neutral',
          strength: 0,
        },
        stochastic: {
          k: 50,
          d: 50,
          condition: 'neutral',
        },
      },
    };
  }

  private async analyzeMediumTerm(
    prices: PriceDTO[],
  ): Promise<MediumTermAnalysis> {
    if (prices.length < 52) {
      console.log(
        'Insufficient data for medium-term analysis, returning default values',
      );
      return this.getDefaultMediumTermAnalysis();
    }

    const adxResult = this.adxService.calculateADX(prices);
    const rocResult = this.momentumService.calculateROC(prices);
    const lastROC = rocResult.normalized[rocResult.normalized.length - 1] || 0;
    const rocSignal = this.momentumService.getROCSignal(lastROC);
    const ichimokuResult = this.ichimokuService.calculateSimplified(prices);

    const volumes = prices.map((p) => p.volume || 0);
    const volumeAnalysis = this.volumeService.analyzeVolume(
      volumes,
      prices,
      '1h',
    );

    const bb = this.maService.calculateBollingerBands(prices);
    const lastBBWidth = bb.width[bb.width.length - 1];
    const prevBBWidth = bb.width[bb.width.length - 2];

    const pivotResult = this.pivotService.calculateLevels(prices);

    const ema12 = this.maService.calculateEMA(prices, 12);
    const ema26 = this.maService.calculateEMA(prices, 26);
    const lastEma12 = ema12[ema12.length - 1];
    const lastEma26 = ema26[ema26.length - 1];

    const trendDirection =
      lastEma12 > lastEma26
        ? 'uptrend'
        : lastEma12 < lastEma26
          ? 'downtrend'
          : 'sideways';

    const recentPrice = prices[prices.length - 1].close!;
    const testedLevel = Math.round(recentPrice * 100) / 100;
    const levelTests = prices.filter(
      (p) => Math.abs(p.close! - testedLevel) / testedLevel < 0.001,
    ).length;

    return {
      timeframe: '1h',
      trend: {
        primary: {
          direction:
            lastEma12 > lastEma26
              ? 'bullish'
              : lastEma12 < lastEma26
                ? 'bearish'
                : 'neutral',
          strength: adxResult.trending ? adxResult.adx / 100 : 0,
          momentum: {
            value: lastROC,
            period: 14,
            sustainedPeriods: this.momentumService.calculateSustainedPeriods(
              rocResult.normalized,
              0.5,
              lastROC > 0 ? 'up' : 'down',
            ),
          },
        },
        price: {
          action: {
            direction: trendDirection,
            strength: Math.min(Math.abs(lastEma12 - lastEma26) / lastEma26, 1),
            testedLevels: {
              recent: testedLevel,
              count: levelTests,
            },
          },
          volatility: {
            bbWidth: lastBBWidth,
            state:
              lastBBWidth > prevBBWidth * 1.05
                ? 'expanding'
                : lastBBWidth < prevBBWidth * 0.95
                  ? 'contracting'
                  : 'stable',
          },
        },
      },
      technicals: {
        momentum: {
          roc: {
            value: lastROC,
            state: rocSignal.condition,
            period: 14,
          },
          adx: {
            value: adxResult.adx / 100,
            trending: adxResult.trending,
            sustainedPeriods: adxResult.sustainedPeriods,
          },
        },
        ichimoku: ichimokuResult,
        levels: {
          // volumeBased removed as support-resistance service is not implemented
          pivots: {
            pivot: pivotResult.pivot,
            r1: pivotResult.r1,
            s1: pivotResult.s1,
            breakout: pivotResult.breakout,
            r1Distance: pivotResult.r1Distance,
          },
        },
        volume: {
          trend: volumeAnalysis.trend.direction,
          significance: volumeAnalysis.significance,
          profile: {
            distribution:
              volumeAnalysis.profile.concentration > 0.7
                ? 'high'
                : volumeAnalysis.profile.concentration < 0.3
                  ? 'low'
                  : 'neutral',
            activity: volumeAnalysis.trend.strength,
            sustainedPeriods: this.momentumService.calculateSustainedPeriods(
              volumes,
              volumes.reduce((a, b) => a + b, 0) / volumes.length,
              volumeAnalysis.trend.direction === 'increasing' ? 'up' : 'down',
            ),
          },
        },
      },
    };
  }

  private getDefaultMediumTermAnalysis(): MediumTermAnalysis {
    return {
      timeframe: '1h',
      trend: {
        primary: {
          direction: 'neutral',
          strength: 0,
          momentum: {
            value: 0,
            period: 14,
            sustainedPeriods: 0,
          },
        },
        price: {
          action: {
            direction: 'sideways',
            strength: 0,
            testedLevels: {
              recent: 0,
              count: 0,
            },
          },
          volatility: {
            bbWidth: 0,
            state: 'stable',
          },
        },
      },
      technicals: {
        momentum: {
          roc: {
            value: 0,
            state: 'neutral',
            period: 14,
          },
          adx: {
            value: 0,
            trending: false,
            sustainedPeriods: 0,
          },
        },
        ichimoku: {
          signal: 'neutral',
          cloudState: 'inside',
          lines: {
            conversion: 0,
            base: 0,
            priceDistance: 0,
          },
        },
        levels: {
          // volumeBased removed as support-resistance service is not implemented
          pivots: {
            pivot: 0,
            r1: 0,
            s1: 0,
            breakout: 'between',
            r1Distance: 0,
          },
        },
        volume: {
          trend: 'stable',
          significance: 0,
          profile: {
            distribution: 'neutral',
            activity: 0,
            sustainedPeriods: 0,
          },
        },
      },
    };
  }

  private calculateVolatility(prices: PriceDTO[], periods: number): number {
    const returns = [];
    for (let i = 1; i < Math.min(periods, prices.length); i++) {
      returns.push(
        ((prices[i].close! - prices[i - 1].close!) / prices[i - 1].close!) *
          100,
      );
    }

    return parseFloat(
      Math.sqrt(
        returns.reduce((acc, ret) => acc + ret * ret, 0) / returns.length,
      ).toFixed(2),
    );
  }
}
