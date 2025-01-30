import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

// Enum for candlestick pattern types
export enum CandlePatternType {
  DOJI = 'DOJI',
  HAMMER = 'HAMMER',
  ENGULFING_BULLISH = 'ENGULFING_BULLISH',
  ENGULFING_BEARISH = 'ENGULFING_BEARISH',
  MORNING_STAR = 'MORNING_STAR',
  THREE_WHITE_SOLDIERS = 'THREE_WHITE_SOLDIERS',
}

// Interface defining a detected pattern
interface CandlePattern {
  type: CandlePatternType;
  position: number; // Position in the price array where the pattern is detected
  strength: number; // Signal strength (0-1)
  candles: PriceDTO[]; // The candles that make up the pattern
}

@Injectable()
export class CandlestickService {
  analyzeCandlestick(candles: PriceDTO[]): CandlePattern[] {
    if (candles.length < 3) {
      return [];
    }

    const patterns: CandlePattern[] = [];

    for (let i = candles.length - 1; i >= 2; i--) {
      // Analysis of single-candle patterns
      const dojiPattern = this.checkDoji(candles[i], i);
      const hammerPattern = this.checkHammer(candles[i], candles[i - 1], i);
      // Analysis of two-candle patterns
      // const engulfingPattern = this.checkEngulfing(candles[i], candles[i - 1], i);
      // Analysis of three-candle patterns
      const morningStarPattern = this.checkMorningStar(
        candles[i],
        candles[i - 1],
        candles[i - 2],
        i,
      );
      const threeWhiteSoldiersPattern = this.checkThreeWhiteSoldiers(
        candles[i],
        candles[i - 1],
        candles[i - 2],
        i,
      );
      [
        dojiPattern,
        hammerPattern,
        morningStarPattern,
        threeWhiteSoldiersPattern,
      ]
        .filter((pattern) => pattern !== null)
        .forEach((pattern) => patterns.push(pattern!));
    }

    return patterns;
  }

  private checkDoji(candle: PriceDTO, position: number): CandlePattern | null {
    if (!this.isDoji(candle)) return null;
    return {
      type: CandlePatternType.DOJI,
      position,
      strength:
        1 -
        Math.abs(candle.close! - candle.open!) / (candle.high! - candle.low!),
      candles: [candle],
    };
  }

  private checkHammer(
    candle: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isHammer(candle, previous)) return null;
    return {
      type: CandlePatternType.HAMMER,
      position,
      strength: Math.min(
        (Math.min(candle.open!, candle.close!) - candle.low!) /
          (2 * Math.abs(candle.close! - candle.open!)),
        1,
      ),
      candles: [candle],
    };
  }

  // private checkEngulfing(current: PriceDTO, previous: PriceDTO, position: number): CandlePattern | null {
  //   const isBullish = this.isBullishEngulfing(current, previous);
  //   const isBearish = this.isBearishEngulfing(current, previous);
  //   if (!isBullish && !isBearish) return null;
  //   return {
  //     type: isBullish ? CandlePatternType.ENGULFING_BULLISH : CandlePatternType.ENGULFING_BEARISH,
  //     position,
  //     strength: Math.min(Math.abs(current.close! - current.open!) / Math.abs(previous.close! - previous.open!), 1),
  //     candles: [previous, current]
  //   };
  // }

  private checkMorningStar(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isMorningStar(c1, c2, c3)) return null;
    return {
      type: CandlePatternType.MORNING_STAR,
      position,
      strength: Math.min(
        (Math.abs(c3.close! - c3.open!) + Math.abs(c1.close! - c1.open!)) /
          (2 * Math.abs(c2.close! - c2.open!)),
        1,
      ),
      candles: [c3, c2, c1],
    };
  }

  private checkThreeWhiteSoldiers(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isThreeWhiteSoldiers(c1, c2, c3)) return null;
    return {
      type: CandlePatternType.THREE_WHITE_SOLDIERS,
      position,
      strength: Math.min(
        Math.abs(c1.close! - c1.open!) / Math.abs(c2.close! - c2.open!),
        1,
      ),
      candles: [c3, c2, c1],
    };
  }

  private isDoji(candle: PriceDTO): boolean {
    return (
      Math.abs(candle.close! - candle.open!) / (candle.high! - candle.low!) <
      0.15
    );
  }

  private isHammer(candle: PriceDTO, previous: PriceDTO): boolean {
    const lowerWick = Math.min(candle.open!, candle.close!) - candle.low!;
    return (
      lowerWick > 2 * Math.abs(candle.close! - candle.open!) &&
      previous.close! < previous.open!
    );
  }

  // private isBullishEngulfing(current: PriceDTO, previous: PriceDTO): boolean {
  //   // Previous candle should be bearish (close < open)
  //   const isPreviousBearish = previous.close! < previous.open!;
  //   // Current candle should be bullish (close > open)
  //   const isCurrentBullish = current.close! > current.open!;
  //   // Current candle should engulf the previous one
  //   const doesEngulf = current.open! <= previous.close! && current.close! >= previous.open!;

  //   return isPreviousBearish && isCurrentBullish && doesEngulf;
  // }

  // private isBearishEngulfing(current: PriceDTO, previous: PriceDTO): boolean {
  //   // Previous candle should be bullish (close > open)
  //   const isPreviousBullish = previous.close! > previous.open!;
  //   // Current candle should be bearish (close < open)
  //   const isCurrentBearish = current.close! < current.open!;
  //   // Current candle should engulf the previous one
  //   const doesEngulf = current.open! >= previous.close! && current.close! <= previous.open!;

  //   return isPreviousBullish && isCurrentBearish && doesEngulf;
  // }

  private isMorningStar(c1: PriceDTO, c2: PriceDTO, c3: PriceDTO): boolean {
    return (
      c3.close! < c3.open! &&
      Math.abs(c2.close! - c2.open!) < Math.abs(c3.close! - c3.open!) * 0.3 &&
      c1.close! > c1.open!
    );
  }

  private isThreeWhiteSoldiers(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
  ): boolean {
    return (
      c3.close! > c3.open! &&
      c2.close! > c2.open! &&
      c1.close! > c1.open! &&
      c2.open! > c3.close! &&
      c1.open! > c2.close!
    );
  }
}
