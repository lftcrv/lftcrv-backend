import { ADXService } from '../adx.service';
import { PriceDTO } from '../../dto/price.dto';

describe('ADXService', () => {
  let service: ADXService;

  beforeEach(() => {
    service = new ADXService();
  });

  describe('DMI Calculation', () => {
    it('should handle basic price series correctly', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 95, high: 100, low: 90, close: 95 },
        { timestamp: 2, price: 90, high: 105, low: 85, close: 90 },
        { timestamp: 3, price: 105, high: 110, low: 100, close: 105 }
      ];

      const result = service.calculateDMI(prices);
      expect(result.plusDI).toBeDefined();
      expect(result.minusDI).toBeDefined();
      expect(result.plusDI.length).toBe(result.minusDI.length);
    });

    it('should identify uptrend correctly', () => {
      const prices: PriceDTO[] = Array(20).fill(null).map((_, i) => ({
        timestamp: i,
        price: 99 + i * 2,     // Using close as price
        high: 100 + i * 2,
        low: 98 + i * 2,
        close: 99 + i * 2
      }));

      const result = service.calculateDMI(prices);
      const lastIndex = result.plusDI.length - 1;
      expect(result.plusDI[lastIndex]).toBeGreaterThan(result.minusDI[lastIndex]);
    });

    it('should identify downtrend correctly', () => {
      const prices: PriceDTO[] = Array(20).fill(null).map((_, i) => ({
        timestamp: i,
        price: 99 - i,         // Using close as price
        high: 100 - i,
        low: 98 - i,
        close: 99 - i
      }));

      const result = service.calculateDMI(prices);
      const lastIndex = result.plusDI.length - 1;
      expect(result.minusDI[lastIndex]).toBeGreaterThan(result.plusDI[lastIndex]);
    });
  });

  describe('ADX Calculation', () => {
    it('should calculate ADX for basic trend', () => {
      const prices: PriceDTO[] = Array(30).fill(null).map((_, i) => ({
        timestamp: i,
        price: 99 + i,         // Using close as price
        high: 100 + i,
        low: 98 + i,
        close: 99 + i
      }));

      const result = service.calculateADX(prices);
      expect(result.adx).toBeDefined();
      expect(typeof result.adx).toBe('number');
      expect(result.adx).toBeGreaterThanOrEqual(0);
      expect(result.adx).toBeLessThanOrEqual(100);
    });

    it('should identify trending market correctly', () => {
      const prices: PriceDTO[] = Array(30).fill(null).map((_, i) => ({
        timestamp: i,
        price: 99 + i * 2,     // Using close as price
        high: 100 + i * 2,     // Strong uptrend
        low: 98 + i * 2,
        close: 99 + i * 2
      }));

      const result = service.calculateADX(prices);
      expect(result.trending).toBe(true);
      expect(result.adx).toBeGreaterThan(25);
    });

    it('should identify non-trending market correctly', () => {
      const prices: PriceDTO[] = Array(30).fill(null).map((_, i) => ({
        timestamp: i,
        price: 99 + Math.sin(i * 0.5) * 2,  // Using close as price
        high: 100 + Math.sin(i * 0.5) * 2,  // Oscillating prices
        low: 98 + Math.sin(i * 0.5) * 2,
        close: 99 + Math.sin(i * 0.5) * 2
      }));

      const result = service.calculateADX(prices);
      expect(result.trending).toBe(false);
      expect(result.adx).toBeLessThan(25);
    });
  });
});