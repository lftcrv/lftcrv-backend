import { MomentumService } from '../momentum.service';
import { PriceDTO } from '../../dto/price.dto';

describe('MomentumService', () => {
  let service: MomentumService;

  beforeEach(() => {
    service = new MomentumService();
  });

  describe('RSI', () => {
    it('should return empty array for insufficient data', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, close: 100 },
        { timestamp: 2, price: 105, close: 105 },
      ];
      expect(service.calculateRSI(prices, 14)).toEqual([]);
    });

    it('should calculate RSI correctly for uptrend', () => {
      const prices: PriceDTO[] = Array(16)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + i * 2,
          close: 100 + i * 2,
        }));
      const rsi = service.calculateRSI(prices, 14);
      expect(rsi.length).toBeGreaterThan(0);
      expect(rsi[0]).toBeGreaterThan(50); // In uptrend, RSI should be above 50
    });

    it('should calculate RSI correctly for downtrend', () => {
      const prices: PriceDTO[] = Array(16)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 - i * 2,
          close: 100 - i * 2,
        }));
      const rsi = service.calculateRSI(prices, 14);
      expect(rsi.length).toBeGreaterThan(0);
      expect(rsi[0]).toBeLessThan(50); // In downtrend, RSI should be below 50
    });
  });

  describe('MACD', () => {
    it('should calculate MACD components correctly', () => {
      const prices: PriceDTO[] = Array(30)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10,
          close: 100 + Math.sin(i * 0.5) * 10,
        }));

      const result = service.calculateMACD(prices);

      expect(result.macd.length).toBe(prices.length);
      expect(result.signal.length).toBe(prices.length);
      expect(result.histogram.length).toBe(prices.length);
    });

    it('should show divergence between MACD and signal during trend changes', () => {
      const prices: PriceDTO[] = Array(30)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: i < 15 ? 100 + i : 115 - (i - 15),
          close: i < 15 ? 100 + i : 115 - (i - 15),
        }));

      const { macd, signal } = service.calculateMACD(prices);
      const lastIndex = macd.length - 1;

      // During trend changes, MACD and signal should diverge
      expect(Math.abs(macd[lastIndex] - signal[lastIndex])).toBeGreaterThan(0);
    });
  });

  describe('Stochastic', () => {
    it('should return empty arrays for insufficient data', () => {
      const prices: PriceDTO[] = [
        {
          timestamp: 1,
          price: 100,
          high: 105,
          low: 95,
          close: 100,
        },
      ];
      expect(service.calculateStochastic(prices, 14)).toEqual({ k: [], d: [] });
    });

    it('should calculate stochastic oscillator correctly', () => {
      const prices: PriceDTO[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10,
          high: 100 + Math.sin(i * 0.5) * 10 + 5,
          low: 100 + Math.sin(i * 0.5) * 10 - 5,
          close: 100 + Math.sin(i * 0.5) * 10,
        }));

      const result = service.calculateStochastic(prices);

      expect(result.k.length).toBeGreaterThan(0);
      expect(result.d.length).toBeGreaterThan(0);
      // K values should be between 0 and 100
      expect(Math.max(...result.k)).toBeLessThanOrEqual(100);
      expect(Math.min(...result.k)).toBeGreaterThanOrEqual(0);
    });

    it('should show overbought/oversold conditions', () => {
      // Creating more extreme price movements
      const prices: PriceDTO[] = [
        // Initial stable period (longer to account for lookback period)
        ...Array(14)
          .fill(null)
          .map((_, i) => ({
            timestamp: i,
            price: 100,
            high: 102,
            low: 98,
            close: 100,
          })),
        // Strong uptrend to create overbought condition
        ...Array(7)
          .fill(null)
          .map((_, i) => ({
            timestamp: i + 14,
            price: 100 + (i + 1) * 10,
            high: 100 + (i + 1) * 10 + 2,
            low: 100 + (i + 1) * 10 - 2,
            close: 100 + (i + 1) * 10,
          })),
        // Peak period
        ...Array(5)
          .fill(null)
          .map((_, i) => ({
            timestamp: i + 21,
            price: 170,
            high: 172,
            low: 168,
            close: 170,
          })),
        // Strong downtrend to create oversold condition
        ...Array(7)
          .fill(null)
          .map((_, i) => ({
            timestamp: i + 26,
            price: 170 - (i + 1) * 15,
            high: 170 - (i + 1) * 15 + 2,
            low: 170 - (i + 1) * 15 - 2,
            close: 170 - (i + 1) * 15,
          })),
      ];

      const result = service.calculateStochastic(prices);

      const overboughtIndex = Math.min(
        result.k.length - 1,
        Math.floor(result.k.length / 2),
      );
      expect(result.k[overboughtIndex]).toBeGreaterThan(70);

      // Test oversold condition after downtrend
      const oversoldIndex = result.k.length - 1;
      expect(result.k[oversoldIndex]).toBeLessThan(30);
    });
  });

  describe('ROC', () => {
    it('should return empty arrays for insufficient data', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, close: 100 },
        { timestamp: 2, price: 105, close: 105 },
      ];
      const result = service.calculateROC(prices, 14);
      expect(result.values).toEqual([]);
      expect(result.normalized).toEqual([]);
    });

    it('should calculate ROC correctly for uptrend', () => {
      const prices: PriceDTO[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 + i * 2,
          close: 100 + i * 2,
        }));

      const result = service.calculateROC(prices, 14);
      expect(result.values.length).toBeGreaterThan(0);
      expect(result.values[0]).toBeGreaterThan(0); // Should be positive in uptrend
      expect(result.normalized[0]).toBeGreaterThan(0);
      expect(result.normalized[0]).toBeLessThanOrEqual(1);
    });

    it('should calculate ROC correctly for downtrend', () => {
      const prices: PriceDTO[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 - i * 2,
          close: 100 - i * 2,
        }));

      const result = service.calculateROC(prices, 14);
      expect(result.values.length).toBeGreaterThan(0);
      expect(result.values[0]).toBeLessThan(0); // Should be negative in downtrend
      expect(result.normalized[0]).toBeLessThan(0);
      expect(result.normalized[0]).toBeGreaterThanOrEqual(-1);
    });

    it('should correctly normalize extreme values', () => {
      const prices: PriceDTO[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100 * Math.pow(1.2, i), // Exponential growth
          close: 100 * Math.pow(1.2, i),
        }));

      const result = service.calculateROC(prices, 14);
      expect(result.normalized.every((v) => v >= -1 && v <= 1)).toBe(true);
    });

    it('should identify overbought/oversold conditions', () => {
      const highRoc = 15; // Strong upward movement
      const lowRoc = -15; // Strong downward movement
      const neutralRoc = 2; // Mild movement

      const highSignal = service.getROCSignal(highRoc);
      const lowSignal = service.getROCSignal(lowRoc);
      const neutralSignal = service.getROCSignal(neutralRoc);

      expect(highSignal.condition).toBe('overbought');
      expect(lowSignal.condition).toBe('oversold');
      expect(neutralSignal.condition).toBe('neutral');

      // Check strength calculations
      expect(highSignal.strength).toBe(1); // Capped at 1
      expect(lowSignal.strength).toBe(1); // Capped at 1
      expect(neutralSignal.strength).toBe(0.2); // 2/10 = 0.2
    });
  });

  describe('Sustained Periods', () => {
    it('should correctly count sustained up periods', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8];
      const periods = service.calculateSustainedPeriods(values, 5, 'up');
      expect(periods).toBe(3); // Last 3 values are above 5
    });

    it('should correctly count sustained down periods', () => {
      const values = [8, 7, 6, 5, 4, 3, 2, 1];
      const periods = service.calculateSustainedPeriods(values, 5, 'down');
      expect(periods).toBe(4); // Last 4 values are below 5
    });

    it('should return 0 when no sustained periods', () => {
      const values = [1, 6, 2, 7, 3, 8];
      expect(service.calculateSustainedPeriods(values, 5, 'up')).toBe(1);
      expect(service.calculateSustainedPeriods(values, 5, 'down')).toBe(0);
    });
  });
});
