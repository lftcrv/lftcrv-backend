import { CandlestickService } from '../candlestick.service';
import { PriceDTO } from '../../dto/price.dto';
import { CandlePatternType } from '../../types';

describe('CandlestickService', () => {
  let service: CandlestickService;

  beforeEach(() => {
    service = new CandlestickService();
  });

  describe('Single Candle Patterns', () => {
    test('should detect a Doji pattern', () => {
      const candles: PriceDTO[] = [
        {
          timestamp: 1,
          price: 100,
          open: 100,
          close: 100.05,
          high: 101.5,
          low: 98.5,
          volume: 1000,
        },
      ];
      const result = service['checkDoji'](candles[0], 0);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.DOJI);
    });

    test('should detect a Hammer pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bearish candle - important for downtrend confirmation
        {
          timestamp: 1,
          price: 100,
          open: 105,
          close: 100,
          high: 106,
          low: 99,
          volume: 1000,
        },
        // Hammer candle - ensure it has a very long lower shadow and small body at top
        {
          timestamp: 2,
          price: 102,
          open: 101,
          close: 102,
          high: 102.2,
          low: 92, // Much lower to create a strong hammer signal
          volume: 1200,
        },
      ];
      const result = service['checkHammer'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.HAMMER);
    });

    test('should detect a Shooting Star pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bullish candle - important for uptrend confirmation
        {
          timestamp: 1,
          price: 100,
          open: 95,
          close: 100,
          high: 101,
          low: 94,
          volume: 1000,
        },
        // Shooting Star candle - ensure it has a very long upper shadow and small body at bottom
        {
          timestamp: 2,
          price: 99,
          open: 99,
          close: 98,
          high: 108, // Much higher to create a strong shooting star signal
          low: 98, // Adjusted to 98 to reduce the lower shadow
          volume: 1200,
        },
      ];
      const result = service['checkShootingStar'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.SHOOTING_STAR);
    });

    test('should detect a Bullish Marubozu pattern', () => {
      const candles: PriceDTO[] = [
        {
          timestamp: 1,
          price: 110,
          open: 100,
          close: 110,
          high: 110.5,
          low: 99.5,
          volume: 1500,
        },
      ];
      const result = service['checkMarubozu'](candles[0], 0);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.MARUBOZU_BULLISH);
    });

    test('should detect a Bearish Marubozu pattern', () => {
      const candles: PriceDTO[] = [
        {
          timestamp: 1,
          price: 90,
          open: 100,
          close: 90,
          high: 100.5,
          low: 89.5,
          volume: 1500,
        },
      ];
      const result = service['checkMarubozu'](candles[0], 0);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.MARUBOZU_BEARISH);
    });
  });

  describe('Two Candle Patterns', () => {
    test('should detect a Bullish Engulfing pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bearish candle
        {
          timestamp: 1,
          price: 97,
          open: 100,
          close: 97,
          high: 101,
          low: 96,
          volume: 1000,
        },
        // Current bullish engulfing candle
        {
          timestamp: 2,
          price: 103,
          open: 96,
          close: 103,
          high: 104,
          low: 95,
          volume: 1500,
        },
      ];
      const result = service['checkEngulfing'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.ENGULFING_BULLISH);
    });

    test('should detect a Bearish Engulfing pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bullish candle
        {
          timestamp: 1,
          price: 103,
          open: 100,
          close: 103,
          high: 104,
          low: 99,
          volume: 1000,
        },
        // Current bearish engulfing candle
        {
          timestamp: 2,
          price: 97,
          open: 104,
          close: 97,
          high: 105,
          low: 96,
          volume: 1500,
        },
      ];
      const result = service['checkEngulfing'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.ENGULFING_BEARISH);
    });

    test('should detect a Bullish Harami pattern', () => {
      const candles: PriceDTO[] = [
        // Previous large bearish candle
        {
          timestamp: 1,
          price: 90,
          open: 100,
          close: 90,
          high: 101,
          low: 89,
          volume: 1200,
        },
        // Current small bullish candle inside previous body
        {
          timestamp: 2,
          price: 93,
          open: 91,
          close: 93,
          high: 94,
          low: 90,
          volume: 900,
        },
      ];
      const result = service['checkHarami'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.HARAMI_BULLISH);
    });

    test('should detect a Bearish Harami pattern', () => {
      const candles: PriceDTO[] = [
        // Previous large bullish candle
        {
          timestamp: 1,
          price: 110,
          open: 100,
          close: 110,
          high: 111,
          low: 99,
          volume: 1200,
        },
        // Current small bearish candle inside previous body
        {
          timestamp: 2,
          price: 107,
          open: 109,
          close: 107,
          high: 109.5,
          low: 106,
          volume: 900,
        },
      ];
      const result = service['checkHarami'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.HARAMI_BEARISH);
    });

    test('should detect a Dark Cloud Cover pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bullish candle
        {
          timestamp: 1,
          price: 105,
          open: 100,
          close: 105,
          high: 106,
          low: 99,
          volume: 1000,
        },
        // Current bearish candle that opens above previous high and closes below midpoint
        {
          timestamp: 2,
          price: 100, // Closing price below midpoint of previous candle
          open: 107, // Opening above previous high
          close: 100,
          high: 107.5,
          low: 99.5,
          volume: 1200,
        },
      ];
      const result = service['checkDarkCloud'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.DARK_CLOUD_COVER);
    });

    test('should detect a Piercing Line pattern', () => {
      const candles: PriceDTO[] = [
        // Previous bearish candle
        {
          timestamp: 1,
          price: 95,
          open: 100,
          close: 95,
          high: 101,
          low: 94,
          volume: 1000,
        },
        // Current bullish candle that opens below previous low and closes above midpoint
        {
          timestamp: 2,
          price: 99, // Closing price above midpoint of previous candle
          open: 93, // Opening below previous low
          close: 99,
          high: 99.5,
          low: 92.5,
          volume: 1200,
        },
      ];
      const result = service['checkPiercingLine'](candles[1], candles[0], 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.PIERCING_LINE);
    });
  });

  describe('Three Candle Patterns', () => {
    test('should detect a Morning Star pattern', () => {
      const candles: PriceDTO[] = [
        // Third candle (bullish) - c1
        {
          timestamp: 3,
          price: 105,
          open: 98,
          close: 105,
          high: 106,
          low: 97,
          volume: 1500,
        },
        // Second candle (small) - c2
        {
          timestamp: 2,
          price: 97,
          open: 97.5,
          close: 97,
          high: 98.5,
          low: 96,
          volume: 800,
        },
        // First candle (bearish) - c3
        {
          timestamp: 1,
          price: 95,
          open: 105,
          close: 95,
          high: 106,
          low: 94,
          volume: 1300,
        },
      ];
      const result = service['checkMorningStar'](
        candles[0],
        candles[1],
        candles[2],
        2,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.MORNING_STAR);
    });

    test('should detect an Evening Star pattern', () => {
      const candles: PriceDTO[] = [
        // Third candle (bearish) - c1
        {
          timestamp: 3,
          price: 95,
          open: 102,
          close: 95,
          high: 103,
          low: 94,
          volume: 1500,
        },
        // Second candle (small) - c2
        {
          timestamp: 2,
          price: 103,
          open: 102.5,
          close: 103,
          high: 104,
          low: 101,
          volume: 800,
        },
        // First candle (bullish) - c3
        {
          timestamp: 1,
          price: 105,
          open: 95,
          close: 105,
          high: 106,
          low: 94,
          volume: 1300,
        },
      ];
      const result = service['checkEveningStar'](
        candles[0],
        candles[1],
        candles[2],
        2,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.EVENING_STAR);
    });

    test('should detect a Three White Soldiers pattern', () => {
      const candles: PriceDTO[] = [
        // Third candle (bullish) - c1
        {
          timestamp: 3,
          price: 110,
          open: 105.5,
          close: 110,
          high: 110.2,
          low: 105,
          volume: 1500,
        },
        // Second candle (bullish) - c2
        {
          timestamp: 2,
          price: 105,
          open: 100.5,
          close: 105,
          high: 105.2,
          low: 100,
          volume: 1400,
        },
        // First candle (bullish) - c3
        {
          timestamp: 1,
          price: 100,
          open: 95,
          close: 100,
          high: 100.2,
          low: 94.5,
          volume: 1300,
        },
      ];
      const result = service['checkThreeWhiteSoldiers'](
        candles[0],
        candles[1],
        candles[2],
        2,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.THREE_WHITE_SOLDIERS);
    });

    test('should detect a Three Black Crows pattern', () => {
      const candles: PriceDTO[] = [
        // Third candle (bearish) - c1
        {
          timestamp: 3,
          price: 90,
          open: 94.5,
          close: 90,
          high: 95,
          low: 89.8,
          volume: 1500,
        },
        // Second candle (bearish) - c2
        {
          timestamp: 2,
          price: 95,
          open: 99.5,
          close: 95,
          high: 100,
          low: 94.8,
          volume: 1400,
        },
        // First candle (bearish) - c3
        {
          timestamp: 1,
          price: 100,
          open: 105,
          close: 100,
          high: 105.5,
          low: 99.8,
          volume: 1300,
        },
      ];
      const result = service['checkThreeBlackCrows'](
        candles[0],
        candles[1],
        candles[2],
        2,
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CandlePatternType.THREE_BLACK_CROWS);
    });
  });

  describe('Integration Tests', () => {
    test('analyzeCandlestick should return all detected patterns', () => {
      // Create a sequence of candles that would trigger multiple patterns
      const candles: PriceDTO[] = [
        // Oldest candle
        {
          timestamp: 1,
          price: 100,
          open: 105,
          close: 100,
          high: 106,
          low: 99,
          volume: 1300,
        },
        // Middle candle
        {
          timestamp: 2,
          price: 95,
          open: 98,
          close: 95,
          high: 99,
          low: 94,
          volume: 1200,
        },
        // Newest candle (Hammer)
        {
          timestamp: 3,
          price: 97,
          open: 96,
          close: 97,
          high: 97.5,
          low: 91, // Very long lower shadow to create clear hammer
          volume: 1500,
        },
      ];

      const patterns = service.analyzeCandlestick(candles);
      expect(patterns.length).toBeGreaterThan(0);

      // Check that we have the expected pattern types
      const patternTypes = patterns.map((p) => p.type);
      expect(patternTypes).toContain(CandlePatternType.HAMMER);
    });
  });

  describe('Pattern Detection Methods', () => {
    test('isDoji should correctly identify a doji', () => {
      const doji: PriceDTO = {
        timestamp: 1,
        price: 100,
        open: 100,
        close: 100.05,
        high: 102,
        low: 98,
        volume: 1000,
      };
      const nonDoji: PriceDTO = {
        timestamp: 2,
        price: 105,
        open: 100,
        close: 105,
        high: 106,
        low: 99,
        volume: 1000,
      };

      expect(service['isDoji'](doji)).toBe(true);
      expect(service['isDoji'](nonDoji)).toBe(false);
    });

    test('isHammer should correctly identify a hammer', () => {
      const prevCandle: PriceDTO = {
        timestamp: 1,
        price: 100,
        open: 105,
        close: 100,
        high: 106,
        low: 99,
        volume: 1000,
      };

      const hammer: PriceDTO = {
        timestamp: 2,
        price: 102,
        open: 101,
        close: 102,
        high: 102.5,
        low: 92, // Long lower shadow to create a clear hammer
        volume: 1200,
      };

      const nonHammer: PriceDTO = {
        timestamp: 2,
        price: 102,
        open: 101,
        close: 102,
        high: 105,
        low: 100,
        volume: 1200,
      };

      expect(service['isHammer'](hammer, prevCandle)).toBe(true);
      expect(service['isHammer'](nonHammer, prevCandle)).toBe(false);
    });
  });
});
