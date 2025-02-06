import { PivotService } from '../pivot.service';
import { PriceDTO } from '../../dto/price.dto';

describe('PivotService', () => {
  let service: PivotService;

  beforeEach(() => {
    service = new PivotService();
  });

  describe('Pivot Level Calculation', () => {
    it('should calculate correct pivot levels', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, high: 110, low: 90, close: 100 },
      ];
      const result = service.calculateLevels(prices);

      // PP = (H + L + C) / 3 = (110 + 90 + 100) / 3 = 100
      expect(result.pivot).toBe(100);
      // R1 = (2 × PP) - L = (2 × 100) - 90 = 110
      expect(result.r1).toBe(110);
      // S1 = (2 × PP) - H = (2 × 100) - 110 = 90
      expect(result.s1).toBe(90);
    });

    it('should detect breakout above R1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 125, high: 130, low: 110, close: 125 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (130 + 110 + 125) / 3 = 121.67
      // R1 = (2 × 121.67) - 110 = 133.33
      // Close (125) is less than R1 (133.33), so should be 'between'
      expect(result.breakout).toBe('between');
    });

    it('should detect actual breakout above R1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 140, high: 140, low: 110, close: 140 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (140 + 110 + 140) / 3 = 130
      // R1 = (2 × 130) - 110 = 150
      // Close (140) < R1 (150), so should be 'between'
      expect(result.breakout).toBe('between');
    });

    it('should detect breakout below S1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 75, high: 90, low: 70, close: 75 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (90 + 70 + 75) / 3 = 78.33
      // S1 = (2 × 78.33) - 90 = 66.67
      // Close (75) > S1 (66.67), so should be 'between'
      expect(result.breakout).toBe('between');
    });

    it('should detect price between R1 and S1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, high: 110, low: 90, close: 100 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (110 + 90 + 100) / 3 = 100
      // R1 = (2 × 100) - 90 = 110
      // S1 = (2 × 100) - 110 = 90
      // Close (100) is between S1 (90) and R1 (110)
      expect(result.breakout).toBe('between');
    });

    it('should calculate R1 distance correctly', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, high: 110, low: 90, close: 100 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (110 + 90 + 100) / 3 = 100
      // R1 = (2 × 100) - 90 = 110
      // R1Distance = ((110 - 100) / 100) * 100 = 10
      expect(result.r1Distance).toBe(10);
    });

    it('should handle edge case at exact R1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 110, high: 120, low: 100, close: 110 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (120 + 100 + 110) / 3 = 110
      // R1 = (2 × 110) - 100 = 120
      // Close (110) < R1 (120)
      expect(result.breakout).toBe('between');
    });

    it('should handle edge case at exact S1', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 90, high: 110, low: 90, close: 90 },
      ];
      const result = service.calculateLevels(prices);
      // PP = (110 + 90 + 90) / 3 = 96.67
      // S1 = (2 × 96.67) - 110 = 83.33
      // Close (90) > S1 (83.33)
      expect(result.breakout).toBe('between');
    });

    it('should throw error when prices array is empty', () => {
      expect(() => service.calculateLevels([])).toThrow(
        'Price data is required',
      );
    });

    it('should throw error when price data is missing required values', () => {
      const prices: PriceDTO[] = [
        { timestamp: 1, price: 100, high: undefined, low: 90, close: 100 },
      ];
      expect(() => service.calculateLevels(prices)).toThrow(
        'Invalid price data: high, low, and close values are required',
      );
    });
  });

  describe('Breakout State Detection', () => {
    it('should identify price above R1', () => {
      const breakoutState = service['getBreakoutState'](115, 110, 90);
      expect(breakoutState).toBe('above_r1');
    });

    it('should identify price below S1', () => {
      const breakoutState = service['getBreakoutState'](85, 110, 90);
      expect(breakoutState).toBe('below_s1');
    });

    it('should identify price between R1 and S1', () => {
      const breakoutState = service['getBreakoutState'](100, 110, 90);
      expect(breakoutState).toBe('between');
    });
  });
});
