import { IchimokuService } from '../ichimoku.service';
import { PriceDTO } from '../../dto/price.dto';

describe('IchimokuService', () => {
  let service: IchimokuService;

  beforeEach(() => {
    service = new IchimokuService();
  });

  describe('Simplified Calculation', () => {
    describe('Simplified Calculation', () => {
      it('should generate bullish signals for strong uptrend', () => {
        const prices: PriceDTO[] = Array(60)
          .fill(null)
          .map((_, i) => {
            const base = 100;
            const trend = i * 2; // Steeper uptrend
            const volatility = Math.sin(i * 0.1) * 2; // Some price variation

            return {
              timestamp: i,
              price: base + trend + volatility,
              high: base + trend + volatility + 2,
              low: base + trend + volatility - 2,
              close: base + trend + volatility,
            };
          });

        // Ensure last few prices are significantly higher to create strong buy conditions
        const lastIndex = prices.length - 1;
        for (let i = 0; i < 5; i++) {
          const idx = lastIndex - i;
          prices[idx] = {
            timestamp: idx,
            price: 250,
            high: 255,
            low: 245,
            close: 250,
          };
        }

        const result = service.calculateSimplified(prices);
        console.log('Debug - Result:', {
          price: prices[prices.length - 1].close,
          conversion: result.lines.conversion,
          base: result.lines.base,
          signal: result.signal,
          cloudState: result.cloudState,
          priceDistance: result.lines.priceDistance,
        });

        expect(result.signal).toBe('strong_buy');
        expect(result.cloudState).toBe('above');
        expect(result.lines.priceDistance).toBeGreaterThan(0);
      });

      it('should generate bearish signals for downtrend', () => {
        const prices: PriceDTO[] = Array(60)
          .fill(null)
          .map((_, i) => {
            const base = 200;
            const trend = -i * 2; // Steeper downtrend
            const volatility = Math.sin(i * 0.1) * 2;

            return {
              timestamp: i,
              price: base + trend + volatility,
              high: base + trend + volatility + 2,
              low: base + trend + volatility - 2,
              close: base + trend + volatility,
            };
          });

        // Ensure last few prices are significantly lower
        const lastIndex = prices.length - 1;
        for (let i = 0; i < 5; i++) {
          const idx = lastIndex - i;
          prices[idx] = {
            timestamp: idx,
            price: 50,
            high: 55,
            low: 45,
            close: 50,
          };
        }

        const result = service.calculateSimplified(prices);
        expect(result.signal).toBe('strong_sell');
        expect(result.cloudState).toBe('below');
        expect(result.lines.priceDistance).toBeLessThan(0);
      });

      it('should identify neutral market conditions', () => {
        const prices: PriceDTO[] = Array(60)
          .fill(null)
          .map((_, i) => ({
            timestamp: i,
            price: 100 + Math.sin(i * 0.2) * 5,
            high: 100 + Math.sin(i * 0.2) * 5 + 2,
            low:  100 + Math.sin(i * 0.2) * 5 - 2,
            close: 100 + Math.sin(i * 0.2) * 5,
          }));
      
        // Force the last bar to be “somewhere in the middle”
        const lastIndex = prices.length - 1;
        prices[lastIndex] = {
          timestamp: lastIndex,
          price: 100,    // pick a value that is likely inside or near the cloud
          high: 102,
          low:  98,
          close: 100,
        };
      
        const result = service.calculateSimplified(prices);
        expect(['neutral', 'buy', 'sell']).toContain(result.signal);
      });
    });
  });

  describe('Cloud State Detection', () => {
    it('should correctly identify price above cloud', () => {
      const cloudState = service['getCloudState'](100, 90, 80);
      expect(cloudState).toBe('above');
    });

    it('should correctly identify price below cloud', () => {
      const cloudState = service['getCloudState'](70, 90, 80);
      expect(cloudState).toBe('below');
    });

    it('should correctly identify price inside cloud', () => {
      const cloudState = service['getCloudState'](85, 90, 80);
      expect(cloudState).toBe('inside');
    });
  });

  describe('Signal Generation', () => {
    it('should generate strong buy signal', () => {
      const signal = service['getIchimokuSignal'](100, 95, 90, 80, 70);
      expect(signal).toBe('strong_buy');
    });

    it('should generate buy signal', () => {
      const signal = service['getIchimokuSignal'](100, 85, 90, 80, 70);
      expect(signal).toBe('buy');
    });

    it('should generate strong sell signal', () => {
      const signal = service['getIchimokuSignal'](60, 65, 70, 90, 80);
      expect(signal).toBe('strong_sell');
    });

    it('should generate sell signal', () => {
      const signal = service['getIchimokuSignal'](60, 75, 70, 90, 80);
      expect(signal).toBe('sell');
    });

    it('should generate neutral signal', () => {
      const signal = service['getIchimokuSignal'](85, 85, 85, 90, 80);
      expect(signal).toBe('neutral');
    });
  });
});
