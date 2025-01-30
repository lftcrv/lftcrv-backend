import { MomentumService } from "../momentum.service";
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
        const prices: PriceDTO[] = Array(16).fill(null).map((_, i) => ({
          timestamp: i,
          price: 100 + i * 2,
          close: 100 + i * 2
        }));
        const rsi = service.calculateRSI(prices, 14);
        expect(rsi.length).toBeGreaterThan(0);
        expect(rsi[0]).toBeGreaterThan(50); // In uptrend, RSI should be above 50
      });
  
      it('should calculate RSI correctly for downtrend', () => {
        const prices: PriceDTO[] = Array(16).fill(null).map((_, i) => ({
          timestamp: i,
          price: 100 - i * 2,
          close: 100 - i * 2
        }));
        const rsi = service.calculateRSI(prices, 14);
        expect(rsi.length).toBeGreaterThan(0);
        expect(rsi[0]).toBeLessThan(50); // In downtrend, RSI should be below 50
      });
    });
  
    describe('MACD', () => {
      it('should calculate MACD components correctly', () => {
        const prices: PriceDTO[] = Array(30).fill(null).map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10,
          close: 100 + Math.sin(i * 0.5) * 10
        }));
        
        const result = service.calculateMACD(prices);
        
        expect(result.macd.length).toBe(prices.length);
        expect(result.signal.length).toBe(prices.length);
        expect(result.histogram.length).toBe(prices.length);
      });
  
      it('should show divergence between MACD and signal during trend changes', () => {
        const prices: PriceDTO[] = Array(30).fill(null).map((_, i) => ({
          timestamp: i,
          price: i < 15 ? 100 + i : 115 - (i - 15),
          close: i < 15 ? 100 + i : 115 - (i - 15)
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
            close: 100
          }
        ];
        expect(service.calculateStochastic(prices, 14)).toEqual({ k: [], d: [] });
      });
  
      it('should calculate stochastic oscillator correctly', () => {
        const prices: PriceDTO[] = Array(20).fill(null).map((_, i) => ({
          timestamp: i,
          price: 100 + Math.sin(i * 0.5) * 10,
          high: 100 + Math.sin(i * 0.5) * 10 + 5,
          low: 100 + Math.sin(i * 0.5) * 10 - 5,
          close: 100 + Math.sin(i * 0.5) * 10
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
          ...Array(14).fill(null).map((_, i) => ({
            timestamp: i,
            price: 100,
            high: 102,
            low: 98,
            close: 100
          })),
          // Strong uptrend to create overbought condition
          ...Array(7).fill(null).map((_, i) => ({
            timestamp: i + 14,
            price: 100 + (i + 1) * 10,
            high: 100 + (i + 1) * 10 + 2,
            low: 100 + (i + 1) * 10 - 2,
            close: 100 + (i + 1) * 10
          })),
          // Peak period
          ...Array(5).fill(null).map((_, i) => ({
            timestamp: i + 21,
            price: 170,
            high: 172,
            low: 168,
            close: 170
          })),
          // Strong downtrend to create oversold condition
          ...Array(7).fill(null).map((_, i) => ({
            timestamp: i + 26,
            price: 170 - (i + 1) * 15,
            high: 170 - (i + 1) * 15 + 2,
            low: 170 - (i + 1) * 15 - 2,
            close: 170 - (i + 1) * 15
          }))
        ];
        
        const result = service.calculateStochastic(prices);
        
        const overboughtIndex = Math.min(result.k.length - 1, Math.floor(result.k.length / 2));
        expect(result.k[overboughtIndex]).toBeGreaterThan(70);
        
        // Test oversold condition after downtrend
        const oversoldIndex = result.k.length - 1;
        expect(result.k[oversoldIndex]).toBeLessThan(30);
      });
    });
  });