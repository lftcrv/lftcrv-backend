import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalService } from '../../technical.service';
import { PriceService } from '../price.service';
import { MovingAverageService } from '../moving-average.service';
import { CandlestickService } from '../candlestick.service';
import { MomentumService } from '../momentum.service';
import { PriceDTO } from '../../dto/price.dto';
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
      ],
    }).compile();

    service = module.get<TechnicalService>(TechnicalService);
    priceService = module.get<PriceService>(PriceService);
  });

  describe('Short Term Analysis', () => {
    it.only('should provide complete short-term analysis with real price data', async () => {
      // Get real price data
      const prices = await priceService.getHistoricalPrices('BTC', '5m', {
        limit: 100,
        priceKind: 'mark',
      });

      expect(prices.length).toBeGreaterThan(0);

      // Test analyzeShortTerm
      const analysis = await (service as any).analyzeShortTerm(prices);

      // Vérification de la structure
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

      // Get raw MACD values for comparison

      // Log des résultats pour inspection
      console.log('analysis:', analysis);
    });
  });

  describe('Medium Term Analysis', () => {
    it('should provide complete medium-term analysis with real price data', async () => {
      // Get real price data
      const prices = await priceService.getHistoricalPrices('BTC', '1h', {
        limit: 48,
        priceKind: 'mark',
      });

      expect(prices.length).toBeGreaterThan(0);

      // Test analyzeMediumTerm
      const analysis = await (service as any).analyzeMediumTerm(prices);

      // Vérification de la structure
      expect(analysis).toMatchObject({
        timeframe: '1h',
        trend: {
          direction: expect.stringMatching(/^(bullish|bearish|neutral)$/),
          crossover: expect.any(String) || null,
          strength: expect.any(Number),
        },
      });

      // Vérifications spécifiques
      expect(analysis.trend.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.trend.strength).toBeLessThanOrEqual(1);

      // Log des résultats pour inspection
      console.log('Medium Term Analysis Results:', {
        direction: analysis.trend.direction,
        crossover: analysis.trend.crossover,
        strength: analysis.trend.strength,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient data for short-term analysis', async () => {
      const prices = await priceService.getHistoricalPrices('BTC', '5m', {
        limit: 2, // Insuffisant pour l'analyse
      });

      const analysis = await (service as any).analyzeShortTerm(prices);
      expect(analysis.patterns.recent).toHaveLength(0);
    });

    it('should handle insufficient data for medium-term analysis', async () => {
      const prices = await priceService.getHistoricalPrices('BTC', '1h', {
        limit: 2, // Insuffisant pour l'analyse
      });

      const analysis = await (service as any).analyzeMediumTerm(prices);
      expect(analysis.trend.direction).toBe('neutral');
    });
  });
});
