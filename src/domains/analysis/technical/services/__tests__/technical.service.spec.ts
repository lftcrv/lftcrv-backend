import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalService } from '../../technical.service';
import { PriceService } from '../price/paradex-price.service';
import { MovingAverageService } from '../moving-average.service';
import { CandlestickService } from '../candlestick.service';
import { MomentumService } from '../momentum.service';
import { ADXService } from '../adx.service';
import { IchimokuService } from '../ichimoku.service';
import { VolumeService } from '../volume.service';
import { PivotService } from '../pivot.service';

describe('TechnicalService', () => {
  let service: TechnicalService;
  let priceService: PriceService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalService,
        PriceService,
        MovingAverageService,
        CandlestickService,
        MomentumService,
        ADXService,
        IchimokuService,
        VolumeService,
        PivotService,
      ],
    }).compile();

    service = module.get<TechnicalService>(TechnicalService);
    priceService = module.get<PriceService>(PriceService);
  });

  describe('Short Term Analysis', () => {
    it('should provide complete short-term analysis with real price data', async () => {
      // Get real price data
      const prices = await priceService.getHistoricalPrices('BTC', '5m', {
        limit: 100,
        priceKind: 'mark',
      });
      expect(prices.length).toBeGreaterThan(0);

      // Test analyzeShortTerm
      const analysis = await (service as any).analyzeShortTerm(prices);
      expect(analysis).toMatchObject({
        timeframe: '5m',
        patterns: {
          recent: expect.any(Array),
        },
        momentum: {
          rsi: {
            value: expect.any(Number),
            condition: expect.stringMatching(/^(oversold|overbought|neutral)$/),
          },
          macd: {
            signal: expect.stringMatching(/^(buy|sell|neutral)$/),
            strength: expect.any(Number),
          },
        },
      });

      expect(analysis.patterns.recent.length).toBeLessThanOrEqual(2);
      expect(analysis.momentum.rsi.value).toBeGreaterThanOrEqual(0);
      expect(analysis.momentum.rsi.value).toBeLessThanOrEqual(100);
      expect(analysis.momentum.macd.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.momentum.macd.strength).toBeLessThanOrEqual(1);
    });
  });

  describe('Medium Term Analysis', () => {
    it('should provide complete medium-term analysis with real price data', async () => {
      // Get real price data
      const prices = await priceService.getHistoricalPrices('BTC', '1h', {
        limit: 100,
        priceKind: 'mark',
      });
      expect(prices.length).toBeGreaterThan(0);

      // Test analyzeMediumTerm
      let analysis;
      try {
        analysis = await (service as any).analyzeMediumTerm(prices);
      } catch (error) {
        console.error('Error in analyzeMediumTerm:', error);
        console.error('Error stack:', error.stack);
        throw error;
      }

      // Verify structure and types
      expect(analysis).toMatchObject({
        timeframe: '1h',
        trend: {
          primary: {
            direction: expect.stringMatching(/^(bullish|bearish|neutral)$/),
            strength: expect.any(Number),
            momentum: {
              value: expect.any(Number),
              period: expect.any(Number),
              sustainedPeriods: expect.any(Number),
            },
          },
          price: {
            action: {
              direction: expect.stringMatching(
                /^(uptrend|downtrend|sideways)$/,
              ),
              strength: expect.any(Number),
              testedLevels: {
                recent: expect.any(Number),
                count: expect.any(Number),
              },
            },
            volatility: {
              bbWidth: expect.any(Number),
              state: expect.stringMatching(/^(expanding|contracting|stable)$/),
            },
          },
        },
        technicals: {
          momentum: {
            roc: {
              value: expect.any(Number),
              state: expect.stringMatching(/^(oversold|overbought|neutral)$/),
              period: expect.any(Number),
            },
            adx: {
              value: expect.any(Number),
              trending: expect.any(Boolean),
              sustainedPeriods: expect.any(Number),
            },
          },
          ichimoku: {
            signal: expect.stringMatching(
              /^(strong_buy|buy|neutral|sell|strong_sell)$/,
            ),
            cloudState: expect.stringMatching(/^(above|below|inside)$/),
            lines: {
              conversion: expect.any(Number),
              base: expect.any(Number),
              priceDistance: expect.any(Number),
            },
          },
          levels: {
            // volumeBased: {
            //   resistance: expect.any(Number),
            //   support: expect.any(Number),
            //   highestVolume: {
            //     price: expect.any(Number),
            //     recentTests: expect.any(Number),
            //   },
            // },
            pivots: {
              pivot: expect.any(Number),
              r1: expect.any(Number),
              s1: expect.any(Number),
              breakout: expect.stringMatching(/^(above_r1|below_s1|between)$/),
              r1Distance: expect.any(Number),
            },
          },
          volume: {
            trend: expect.stringMatching(/^(increasing|decreasing|stable)$/),
            significance: expect.any(Number),
            profile: {
              distribution: expect.stringMatching(/^(high|low|neutral)$/),
              activity: expect.any(Number),
              sustainedPeriods: expect.any(Number),
            },
          },
        },
      });

      // Value range checks
      expect(analysis.trend.primary.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.trend.primary.strength).toBeLessThanOrEqual(1);
      expect(analysis.trend.primary.momentum.value).toBeGreaterThanOrEqual(-1);
      expect(analysis.trend.primary.momentum.value).toBeLessThanOrEqual(1);
      expect(analysis.trend.price.action.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.trend.price.action.strength).toBeLessThanOrEqual(1);
      expect(analysis.technicals.momentum.adx.value).toBeGreaterThanOrEqual(0);
      expect(analysis.technicals.momentum.adx.value).toBeLessThanOrEqual(1);
      expect(analysis.technicals.volume.significance).toBeGreaterThanOrEqual(0);
      expect(analysis.technicals.volume.significance).toBeLessThanOrEqual(1);
      expect(
        analysis.technicals.volume.profile.activity,
      ).toBeGreaterThanOrEqual(0);
      expect(analysis.technicals.volume.profile.activity).toBeLessThanOrEqual(
        1,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient data for short-term analysis', async () => {
      const prices = await priceService.getHistoricalPrices('BTC', '5m', {
        limit: 2, // Insufficient for analysis
      });
      const analysis = await (service as any).analyzeShortTerm(prices);

      // Verify default values
      expect(analysis.timeframe).toBe('5m');
      expect(analysis.patterns.recent).toHaveLength(0);
      expect(analysis.momentum.rsi.value).toBe(50);
      expect(analysis.momentum.rsi.condition).toBe('neutral');
      expect(analysis.momentum.macd.signal).toBe('neutral');
      expect(analysis.momentum.macd.strength).toBe(0);
      expect(analysis.momentum.stochastic.k).toBe(50);
      expect(analysis.momentum.stochastic.d).toBe(50);
      expect(analysis.momentum.stochastic.condition).toBe('neutral');
    });

    it('should handle insufficient data for medium-term analysis', async () => {
      const prices = await priceService.getHistoricalPrices('BTC', '1h', {
        limit: 2, // Insufficient for analysis
      });
      const analysis = await (service as any).analyzeMediumTerm(prices);

      // Verify default/fallback values for insufficient data
      expect(analysis.trend.primary.direction).toBe('neutral');
      expect(analysis.trend.primary.strength).toBe(0);
      expect(analysis.technicals.momentum.adx.trending).toBe(false);
      expect(analysis.technicals.volume.trend).toBe('stable');
    });
  });
});
