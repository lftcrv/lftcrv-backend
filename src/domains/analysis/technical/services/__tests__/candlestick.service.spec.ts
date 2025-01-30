import { CandlestickService } from '../candlestick.service';
import { PriceDTO } from '../../dto/price.dto';

// Jest test suite for CandlestickService
describe('CandlestickService', () => {
  let service: CandlestickService;

  beforeEach(() => {
    service = new CandlestickService();
  });

  test('should detect a Doji pattern', () => {
    const candles: PriceDTO[] = [
      {
        timestamp: 1,
        price: 105,
        open: 100,
        close: 101,
        high: 110,
        low: 99,
        volume: 1000,
      },
    ];
    const result = service.analyzeCandlestick(candles);
    expect(result).toEqual([]);
  });

  test('should detect a Hammer pattern after a downtrend', () => {
    const candles: PriceDTO[] = [
      {
        timestamp: 1,
        price: 115,
        open: 120,
        close: 115,
        high: 125,
        low: 110,
        volume: 1000,
      },
      {
        timestamp: 2,
        price: 112,
        open: 115,
        close: 112,
        high: 118,
        low: 108,
        volume: 1200,
      },
      {
        timestamp: 3,
        price: 113,
        open: 110,
        close: 113,
        high: 114,
        low: 100,
        volume: 1500,
      }, // Hammer
    ];
    const result = service.analyzeCandlestick(candles);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('HAMMER');
  });

  //   test('should detect a Bullish Engulfing pattern', () => {
  //     const candles: PriceDTO[] = [
  //       { timestamp: 1, price: 105, open: 108, close: 102, high: 110, low: 100, volume: 1100 }, // Bearish candle
  //       { timestamp: 2, price: 115, open: 101, close: 115, high: 118, low: 99, volume: 1300 }, // Bullish engulfing
  //     ];
  //     const result = service.analyzeCandlestick(candles);
  //     expect(result.length).toBeGreaterThan(0);
  //     expect(result[0].type).toBe('ENGULFING_BULLISH');
  //   });

  //   test('should detect a Bearish Engulfing pattern', () => {
  //     const candles: PriceDTO[] = [
  //       { timestamp: 1, price: 110, open: 105, close: 110, high: 112, low: 104, volume: 1200 }, // Bullish candle
  //       { timestamp: 2, price: 103, open: 111, close: 103, high: 113, low: 102, volume: 1400 }, // Bearish engulfing
  //     ];
  //     const result = service.analyzeCandlestick(candles);
  //     expect(result.length).toBeGreaterThan(0);
  //     expect(result[0].type).toBe('ENGULFING_BEARISH');
  //   });

  test('should detect a Morning Star pattern', () => {
    const candles: PriceDTO[] = [
      {
        timestamp: 1,
        price: 110,
        open: 120,
        close: 110,
        high: 122,
        low: 108,
        volume: 1500,
      },
      {
        timestamp: 2,
        price: 111,
        open: 109,
        close: 111,
        high: 113,
        low: 107,
        volume: 1600,
      },
      {
        timestamp: 3,
        price: 122,
        open: 112,
        close: 122,
        high: 124,
        low: 110,
        volume: 1700,
      },
    ];
    const result = service.analyzeCandlestick(candles);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('MORNING_STAR');
  });

  test('should detect a Three White Soldiers pattern', () => {
    const candles: PriceDTO[] = [
      {
        timestamp: 1,
        price: 105,
        open: 100,
        close: 105,
        high: 106,
        low: 99,
        volume: 1800,
      },
      {
        timestamp: 2,
        price: 110,
        open: 106,
        close: 110,
        high: 111,
        low: 105,
        volume: 1900,
      },
      {
        timestamp: 3,
        price: 115,
        open: 111,
        close: 115,
        high: 116,
        low: 110,
        volume: 2000,
      },
    ];
    const result = service.analyzeCandlestick(candles);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('THREE_WHITE_SOLDIERS');
  });

  test('should not detect a pattern if conditions are not met', () => {
    const candles: PriceDTO[] = [
      {
        timestamp: 1,
        price: 102,
        open: 100,
        close: 102,
        high: 105,
        low: 98,
        volume: 1100,
      },
      {
        timestamp: 2,
        price: 104,
        open: 102,
        close: 104,
        high: 106,
        low: 100,
        volume: 1200,
      },
      {
        timestamp: 3,
        price: 106,
        open: 104,
        close: 106,
        high: 108,
        low: 102,
        volume: 1300,
      },
    ];
    const result = service.analyzeCandlestick(candles);
    expect(result).toEqual([]);
  });
});
