import { MovingAverageService } from '../moving-average.service';
import { PriceDTO } from '../../dto/price.dto';

describe('MovingAverageService', () => {
  let service: MovingAverageService;

  beforeEach(() => {
    service = new MovingAverageService();
  });

  describe('SMA', () => {
    it('should throw error for invalid prices array', () => {
      expect(() => service.calculateSMA([], 5)).toThrow('Invalid prices array');
    });

    it('should throw error for invalid period', () => {
      const prices: PriceDTO[] = [{ timestamp: 1, price: 100, close: 100 }];
      expect(() => service.calculateSMA(prices, 0)).toThrow('Invalid period');
      expect(() => service.calculateSMA(prices, 2)).toThrow('Invalid period');
    });

    it('should correctly calculate SMA for steady prices', () => {
      const prices: PriceDTO[] = Array(10)
        .fill(null)
        .map(() => ({
          timestamp: 1,
          price: 100,
          close: 100,
        }));

      const sma = service.calculateSMA(prices, 5);
      expect(sma.length).toBe(6); // (10 - period + 1) values
      expect(sma[0]).toBe(100);
      expect(sma[sma.length - 1]).toBe(100);
    });

    it('should correctly calculate SMA for increasing prices', () => {
      const prices: PriceDTO[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + i * 10,
          close: 100 + i * 10,
        }));

      const sma = service.calculateSMA(prices, 5);
      expect(sma[0]).toBe(120); // Average of first 5 prices (100,110,120,130,140)
      expect(sma[sma.length - 1]).toBe(170); // Average of last 5 prices (150,160,170,180,190)
    });
  });

  describe('EMA', () => {
    it('should throw error for invalid prices array', () => {
      expect(() => service.calculateEMA([], 5)).toThrow('Invalid prices array');
    });

    it('should throw error for invalid period', () => {
      const prices: PriceDTO[] = [{ timestamp: 1, price: 100, close: 100 }];
      expect(() => service.calculateEMA(prices, 0)).toThrow('Invalid period');
      expect(() => service.calculateEMA(prices, 2)).toThrow('Invalid period');
    });

    it('should correctly calculate EMA for steady prices', () => {
      const prices: PriceDTO[] = Array(10)
        .fill(null)
        .map(() => ({
          timestamp: 1,
          price: 100,
          close: 100,
        }));

      const ema = service.calculateEMA(prices, 5);
      expect(ema.length).toBe(10);
      expect(ema[0]).toBe(100);
      expect(Math.round(ema[ema.length - 1])).toBe(100);
    });

    it('should correctly calculate EMA for increasing prices', () => {
      const prices: PriceDTO[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + i * 10,
          close: 100 + i * 10,
        }));

      const ema = service.calculateEMA(prices, 5);
      expect(ema[0]).toBe(100); // First value is same as first price
      // EMA should lag behind price increases but be higher than SMA
      expect(ema[ema.length - 1]).toBeLessThan(190); // Less than last price
      expect(ema[ema.length - 1]).toBeGreaterThan(170); // Greater than last SMA
    });
  });

  describe('Crossover Detection', () => {
    it('should throw error for insufficient data points', () => {
      expect(() => service.detectCrossover([1], [1])).toThrow(
        'Need at least 2 points to detect crossover',
      );
    });

    it('should detect bullish crossover', () => {
      const shortMA = [10, 11, 12, 13];
      const longMA = [12, 12, 12, 12];
      const result = service.detectCrossover(shortMA, longMA);

      expect(result.type).toBe('bullish');
      expect(result.shortMA).toBe(13);
      expect(result.longMA).toBe(12);
    });

    it('should detect bearish crossover', () => {
      const shortMA = [14, 13, 12, 11];
      const longMA = [12, 12, 12, 12];
      const result = service.detectCrossover(shortMA, longMA);

      expect(result.type).toBe('bearish');
      expect(result.shortMA).toBe(11);
      expect(result.longMA).toBe(12);
    });

    it('should return null type for no crossover', () => {
      const shortMA = [13, 13, 13, 13];
      const longMA = [11, 11, 11, 11];
      const result = service.detectCrossover(shortMA, longMA);

      expect(result.type).toBeNull();
      expect(result.shortMA).toBe(13);
      expect(result.longMA).toBe(11);
    });

    it('should work with real SMA data', () => {
      const prices: PriceDTO[] = Array(30)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10, // Create sine wave pattern
          close: 100 + Math.sin(i * 0.5) * 10,
        }));

      const shortSMA = service.calculateSMA(prices, 5);
      const longSMA = service.calculateSMA(prices, 10);
      const result = service.detectCrossover(shortSMA, longSMA);

      // Should detect either a crossover or no crossover
      expect(['bullish', 'bearish', null]).toContain(result.type);
    });
  });

  describe('Bollinger Bands', () => {
    it('should throw error for invalid prices array', () => {
      expect(() => service.calculateBollingerBands([], 20)).toThrow(
        'Invalid prices array',
      );
    });

    it('should throw error for invalid period', () => {
      const prices: PriceDTO[] = [{ timestamp: 1, price: 100, close: 100 }];
      expect(() => service.calculateBollingerBands(prices, 0)).toThrow(
        'Invalid period',
      );
      expect(() => service.calculateBollingerBands(prices, 2)).toThrow(
        'Invalid period',
      );
    });

    it('should correctly calculate bands for steady prices', () => {
      const prices: PriceDTO[] = Array(30)
        .fill(null)
        .map(() => ({
          timestamp: 1,
          price: 100,
          close: 100,
        }));

      const result = service.calculateBollingerBands(prices, 20, 2);

      expect(result.middle[0]).toBe(100);
      expect(result.upper[0]).toBe(100); // No deviation in steady prices
      expect(result.lower[0]).toBe(100);
      expect(result.width[0]).toBe(0); // Zero width for steady prices
    });

    it('should correctly calculate bands for volatile prices', () => {
      const prices: PriceDTO[] = Array(30)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10, // Sine wave pattern
          close: 100 + Math.sin(i * 0.5) * 10,
        }));

      const result = service.calculateBollingerBands(prices, 20, 2);

      // Upper band should always be above middle
      expect(result.upper[0]).toBeGreaterThan(result.middle[0]);
      // Lower band should always be below middle
      expect(result.lower[0]).toBeLessThan(result.middle[0]);
      // Width should be positive
      expect(result.width[0]).toBeGreaterThan(0);
    });

    it('should detect correct band position', () => {
      const upper = 110;
      const lower = 90;
      const middle = 100;

      expect(service.getBollingerBandPosition(115, upper, lower)).toBe('above');
      expect(service.getBollingerBandPosition(85, upper, lower)).toBe('below');
      expect(service.getBollingerBandPosition(100, upper, lower)).toBe(
        'inside',
      );
    });

    it('should calculate normalized width correctly', () => {
      const upper = 120;
      const lower = 80;
      const middle = 100;

      const width = service.getBollingerBandWidth(upper, lower, middle);
      expect(width).toBe(0.4); // (120 - 80) / 100 = 0.4
    });

    it('should handle price volatility changes', () => {
      // Create prices with increasing volatility
      const prices: PriceDTO[] = Array(40)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * (i / 2), // Increasing amplitude
          close: 100 + Math.sin(i * 0.5) * (i / 2),
        }));

      const result = service.calculateBollingerBands(prices, 20, 2);

      // Width should increase with volatility
      const earlyWidth = result.width[0];
      const lateWidth = result.width[result.width.length - 1];
      expect(lateWidth).toBeGreaterThan(earlyWidth);
    });
  });
});
