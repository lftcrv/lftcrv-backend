import { VolumeService } from '../volume.service';
import { PriceDTO } from '../../dto/price.dto';

describe('VolumeService', () => {
  let service: VolumeService;

  beforeEach(() => {
    service = new VolumeService();
  });

  describe('Basic Volume Analysis', () => {
    it('should analyze volume trends correctly', () => {
      const volumes = [
        80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
      ];
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100 + i,
        close: 100 + i,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');

      expect(result.trend).toBeDefined();
      expect(result.trend.direction).toBe('increasing');
      expect(result.trend.strength).toBeGreaterThan(0);
      expect(result.significance).toBeGreaterThan(0);
      expect(result.significance).toBeLessThanOrEqual(1);
    });

    it('should detect decreasing volume trend', () => {
      const volumes = [
        190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80,
      ];
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.trend.direction).toBe('decreasing');
      expect(result.trend.strength).toBeGreaterThan(0);
    });

    it('should detect stable volume', () => {
      const volumes = [100, 101, 102, 101, 100, 99, 100, 101, 100, 100];
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.trend.direction).toBe('stable');
      expect(result.trend.strength).toBeLessThan(0.1);
    });
  });

  describe('Volume Profile Analysis', () => {
    it('should identify dominant price level', () => {
      const volumes = [100, 200, 300, 200, 100]; // Highest volume at middle price
      const prices: PriceDTO[] = [
        { timestamp: 0, price: 90, close: 90 },
        { timestamp: 1, price: 100, close: 100 },
        { timestamp: 2, price: 100, close: 100 }, // High volume price
        { timestamp: 3, price: 100, close: 100 },
        { timestamp: 4, price: 110, close: 110 },
      ];

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.profile.dominantLevel).toBe(100);
      expect(result.profile.concentration).toBeGreaterThan(0.5);
    });

    it('should calculate correct volume concentration', () => {
      const volumes = [100, 100, 500, 100, 100]; // Very concentrated volume
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.profile.concentration).toBeGreaterThan(0.8);
    });
  });

  describe('Timeframe Adaptability', () => {
    const generateTestData = (length: number) => ({
      volumes: Array(length).fill(100),
      prices: Array(length)
        .fill(null)
        .map((_, i) => ({
          timestamp: i,
          price: 100,
          close: 100,
        })),
    });

    it('should adapt analysis to 1m timeframe', () => {
      const { volumes, prices } = generateTestData(35); // More than 30 periods
      const result = service.analyzeVolume(volumes, prices, '1m');
      expect(result.trend).toBeDefined();
      expect(result.significance).toBeDefined();
    });

    it('should adapt analysis to 1h timeframe', () => {
      const { volumes, prices } = generateTestData(30);
      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.trend).toBeDefined();
      expect(result.significance).toBeDefined();
    });

    it('should adapt analysis to 1d timeframe', () => {
      const { volumes, prices } = generateTestData(25);
      const result = service.analyzeVolume(volumes, prices, '1d');
      expect(result.trend).toBeDefined();
      expect(result.significance).toBeDefined();
    });
  });

  describe('Volume Significance', () => {
    it('should calculate correct significance for above-average volume', () => {
      const volumes = Array(19).fill(100).concat([200]); // Last volume 2x average
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.significance).toBe(1); // Capped at 1
    });

    it('should calculate correct significance for below-average volume', () => {
      const volumes = Array(19).fill(100).concat([50]); // Last volume 0.5x average
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.significance).toBe(0.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty arrays', () => {
      expect(() => service.analyzeVolume([], [], '1h')).toThrow(
        'Volume and price data required',
      );
    });

    it('should handle single data point', () => {
      const volumes = [100];
      const prices: PriceDTO[] = [{ timestamp: 0, price: 100, close: 100 }];

      const result = service.analyzeVolume(volumes, prices, '1h');
      expect(result.trend.direction).toBe('stable');
      expect(result.significance).toBe(1);
      expect(result.profile.concentration).toBe(1);
    });

    it('should handle invalid timeframe gracefully', () => {
      const volumes = [100, 100];
      const prices: PriceDTO[] = volumes.map((_, i) => ({
        timestamp: i,
        price: 100,
        close: 100,
      }));

      // Should use default period when invalid timeframe provided
      const result = service.analyzeVolume(volumes, prices, 'invalid' as any);
      expect(result.trend).toBeDefined();
      expect(result.significance).toBeDefined();
    });
  });
});
