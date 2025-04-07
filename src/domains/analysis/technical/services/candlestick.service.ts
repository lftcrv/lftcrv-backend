import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';
import { CandlePatternType } from '../types';

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
      const shootingStarPattern = this.checkShootingStar(
        candles[i],
        candles[i - 1],
        i,
      );
      const marubozuPattern = this.checkMarubozu(candles[i], i);

      // Analysis of two-candle patterns
      const engulfingPattern = this.checkEngulfing(
        candles[i],
        candles[i - 1],
        i,
      );
      const haramiPattern = this.checkHarami(candles[i], candles[i - 1], i);
      const darkCloudPattern = this.checkDarkCloud(
        candles[i],
        candles[i - 1],
        i,
      );
      const piercingLinePattern = this.checkPiercingLine(
        candles[i],
        candles[i - 1],
        i,
      );

      // Analysis of three-candle patterns
      const morningStarPattern = this.checkMorningStar(
        candles[i],
        candles[i - 1],
        candles[i - 2],
        i,
      );
      const eveningStarPattern = this.checkEveningStar(
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
      const threeBlackCrowsPattern = this.checkThreeBlackCrows(
        candles[i],
        candles[i - 1],
        candles[i - 2],
        i,
      );

      [
        dojiPattern,
        hammerPattern,
        shootingStarPattern,
        marubozuPattern,
        engulfingPattern,
        haramiPattern,
        darkCloudPattern,
        piercingLinePattern,
        morningStarPattern,
        eveningStarPattern,
        threeWhiteSoldiersPattern,
        threeBlackCrowsPattern,
      ]
        .filter((pattern) => pattern !== null)
        .forEach((pattern) => patterns.push(pattern!));
    }

    return patterns;
  }

  // Single-candle patterns

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

  private checkShootingStar(
    candle: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isShootingStar(candle, previous)) return null;
    return {
      type: CandlePatternType.SHOOTING_STAR,
      position,
      strength: Math.min(
        (candle.high! - Math.max(candle.open!, candle.close!)) /
          (2 * Math.abs(candle.close! - candle.open!)),
        1,
      ),
      candles: [candle],
    };
  }

  private checkMarubozu(
    candle: PriceDTO,
    position: number,
  ): CandlePattern | null {
    const isBullishMarubozu = this.isBullishMarubozu(candle);
    const isBearishMarubozu = this.isBearishMarubozu(candle);

    if (!isBullishMarubozu && !isBearishMarubozu) return null;

    return {
      type: isBullishMarubozu
        ? CandlePatternType.MARUBOZU_BULLISH
        : CandlePatternType.MARUBOZU_BEARISH,
      position,
      strength: Math.min(
        Math.abs(candle.close! - candle.open!) /
          (candle.high! - candle.low! || 1),
        1,
      ),
      candles: [candle],
    };
  }

  // Two-candle patterns

  private checkEngulfing(
    current: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    const isBullish = this.isBullishEngulfing(current, previous);
    const isBearish = this.isBearishEngulfing(current, previous);

    if (!isBullish && !isBearish) return null;

    return {
      type: isBullish
        ? CandlePatternType.ENGULFING_BULLISH
        : CandlePatternType.ENGULFING_BEARISH,
      position,
      strength: Math.min(
        Math.abs(current.close! - current.open!) /
          Math.abs(previous.close! - previous.open! || 0.01),
        1,
      ),
      candles: [previous, current],
    };
  }

  private checkHarami(
    current: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    const isBullish = this.isBullishHarami(current, previous);
    const isBearish = this.isBearishHarami(current, previous);

    if (!isBullish && !isBearish) return null;

    return {
      type: isBullish
        ? CandlePatternType.HARAMI_BULLISH
        : CandlePatternType.HARAMI_BEARISH,
      position,
      strength: Math.min(
        1 -
          Math.abs(current.close! - current.open!) /
            Math.abs(previous.close! - previous.open! || 0.01),
        1,
      ),
      candles: [previous, current],
    };
  }

  private checkDarkCloud(
    current: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isDarkCloud(current, previous)) return null;

    const penetration =
      (previous.close! - current.close!) / (previous.close! - previous.open!);

    return {
      type: CandlePatternType.DARK_CLOUD_COVER,
      position,
      strength: Math.min(penetration, 1),
      candles: [previous, current],
    };
  }

  private checkPiercingLine(
    current: PriceDTO,
    previous: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isPiercingLine(current, previous)) return null;

    const penetration =
      (current.close! - previous.close!) / (previous.open! - previous.close!);

    return {
      type: CandlePatternType.PIERCING_LINE,
      position,
      strength: Math.min(penetration, 1),
      candles: [previous, current],
    };
  }

  // Three-candle patterns

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
          (2 * Math.abs(c2.close! - c2.open! || 0.01)),
        1,
      ),
      candles: [c3, c2, c1],
    };
  }

  private checkEveningStar(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isEveningStar(c1, c2, c3)) return null;
    return {
      type: CandlePatternType.EVENING_STAR,
      position,
      strength: Math.min(
        (Math.abs(c3.close! - c3.open!) + Math.abs(c1.close! - c1.open!)) /
          (2 * Math.abs(c2.close! - c2.open! || 0.01)),
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
        Math.abs(c1.close! - c1.open!) / Math.abs(c2.close! - c2.open! || 0.01),
        1,
      ),
      candles: [c3, c2, c1],
    };
  }

  private checkThreeBlackCrows(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
    position: number,
  ): CandlePattern | null {
    if (!this.isThreeBlackCrows(c1, c2, c3)) return null;
    return {
      type: CandlePatternType.THREE_BLACK_CROWS,
      position,
      strength: Math.min(
        Math.abs(c1.close! - c1.open!) / Math.abs(c2.close! - c2.open! || 0.01),
        1,
      ),
      candles: [c3, c2, c1],
    };
  }

  // Pattern Detection Methods

  private isDoji(candle: PriceDTO): boolean {
    const bodySize = Math.abs(candle.close! - candle.open!);
    const candleRange = candle.high! - candle.low!;

    return bodySize / candleRange < 0.1 && candleRange > 0;
  }

  private isHammer(candle: PriceDTO, previous: PriceDTO): boolean {
    // Hammer has a small body at the top with a long lower shadow
    const bodySize = Math.abs(candle.close! - candle.open!);
    const candleRange = candle.high! - candle.low!;
    if (candleRange === 0) return false;
    const body = Math.min(candle.open!, candle.close!);
    const lowerShadow = body - candle.low!;
    const upperShadow = candle.high! - Math.max(candle.open!, candle.close!);

    const isHammerShape =
      lowerShadow >= 2 * bodySize && upperShadow <= 0.1 * candleRange;

    // Should appear in a downtrend
    const isInDowntrend = previous.close! < previous.open!;

    return isHammerShape && isInDowntrend;
  }

  private isShootingStar(candle: PriceDTO, previous: PriceDTO): boolean {
    // Shooting star has a small body at the bottom with a long upper shadow
    const bodySize = Math.abs(candle.close! - candle.open!);
    const candleRange = candle.high! - candle.low!;

    if (candleRange === 0) return false;

    const upperShadow = candle.high! - Math.max(candle.open!, candle.close!);
    const lowerShadow = Math.min(candle.open!, candle.close!) - candle.low!;

    // Upper shadow should be at least 2x the body size
    // Lower shadow should be small
    const isShootingStarShape =
      upperShadow >= 2 * bodySize &&
      lowerShadow <= 0.3 * bodySize &&
      bodySize < 0.3 * candleRange;

    // Should appear in an uptrend
    const isInUptrend = previous.close! > previous.open!;

    // For a proper shooting star, it should be a bearish (red) candle
    // This isn't always required, but makes the pattern more reliable
    const isBearish = candle.close! < candle.open!;

    return isShootingStarShape && isInUptrend && isBearish;
  }

  private isBullishMarubozu(candle: PriceDTO): boolean {
    // Bullish Marubozu is a long bullish candle with no or very small shadows
    const isBullish = candle.close! > candle.open!;
    const bodySize = Math.abs(candle.close! - candle.open!);
    const candleRange = candle.high! - candle.low!;

    if (candleRange === 0) return false;

    const upperShadow = candle.high! - candle.close!;
    const lowerShadow = candle.open! - candle.low!;

    // Body should be at least 80% of the candle range
    // Shadows should be very small
    return (
      isBullish &&
      bodySize / candleRange >= 0.8 &&
      upperShadow <= 0.1 * bodySize &&
      lowerShadow <= 0.1 * bodySize
    );
  }

  private isBearishMarubozu(candle: PriceDTO): boolean {
    // Bearish Marubozu is a long bearish candle with no or very small shadows
    const isBearish = candle.close! < candle.open!;
    const bodySize = Math.abs(candle.close! - candle.open!);
    const candleRange = candle.high! - candle.low!;

    if (candleRange === 0) return false;

    const upperShadow = candle.high! - candle.open!;
    const lowerShadow = candle.close! - candle.low!;

    // Body should be at least 80% of the candle range
    // Shadows should be very small
    return (
      isBearish &&
      bodySize / candleRange >= 0.8 &&
      upperShadow <= 0.1 * bodySize &&
      lowerShadow <= 0.1 * bodySize
    );
  }

  private isBullishEngulfing(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bearish (close < open)
    const isPreviousBearish = previous.close! < previous.open!;

    // Current candle should be bullish (close > open)
    const isCurrentBullish = current.close! > current.open!;

    // Current candle should engulf the previous one
    const doesEngulf =
      current.open! <= previous.close! && current.close! >= previous.open!;

    // Body sizes - current should be larger than previous
    const currentBodySize = Math.abs(current.close! - current.open!);
    const previousBodySize = Math.abs(previous.close! - previous.open!);
    const isBodyLarger = currentBodySize > previousBodySize;

    return isPreviousBearish && isCurrentBullish && doesEngulf && isBodyLarger;
  }

  private isBearishEngulfing(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bullish (close > open)
    const isPreviousBullish = previous.close! > previous.open!;

    // Current candle should be bearish (close < open)
    const isCurrentBearish = current.close! < current.open!;

    // Current candle should engulf the previous one
    const doesEngulf =
      current.open! >= previous.close! && current.close! <= previous.open!;

    // Body sizes - current should be larger than previous
    const currentBodySize = Math.abs(current.close! - current.open!);
    const previousBodySize = Math.abs(previous.close! - previous.open!);
    const isBodyLarger = currentBodySize > previousBodySize;

    return isPreviousBullish && isCurrentBearish && doesEngulf && isBodyLarger;
  }

  private isBullishHarami(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bearish (close < open)
    const isPreviousBearish = previous.close! < previous.open!;

    // Current candle should be bullish (close > open)
    const isCurrentBullish = current.close! > current.open!;

    // Current candle body should be contained within the previous one
    const isContained =
      current.open! >= previous.close! && current.close! <= previous.open!;

    // Body sizes - current should be smaller than previous
    const currentBodySize = Math.abs(current.close! - current.open!);
    const previousBodySize = Math.abs(previous.close! - previous.open!);
    const isBodySmaller = currentBodySize < previousBodySize * 0.6;

    return (
      isPreviousBearish && isCurrentBullish && isContained && isBodySmaller
    );
  }

  private isBearishHarami(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bullish (close > open)
    const isPreviousBullish = previous.close! > previous.open!;

    // Current candle should be bearish (close < open)
    const isCurrentBearish = current.close! < current.open!;

    // Current candle body should be contained within the previous one
    const isContained =
      current.open! <= previous.close! && current.close! >= previous.open!;

    // Body sizes - current should be smaller than previous
    const currentBodySize = Math.abs(current.close! - current.open!);
    const previousBodySize = Math.abs(previous.close! - previous.open!);
    const isBodySmaller = currentBodySize < previousBodySize * 0.6;

    return (
      isPreviousBullish && isCurrentBearish && isContained && isBodySmaller
    );
  }

  private isDarkCloud(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bullish (close > open)
    const isPreviousBullish = previous.close! > previous.open!;

    // Current candle should be bearish (close < open)
    const isCurrentBearish = current.close! < current.open!;

    // Current candle should open above previous high and close below midpoint of previous body
    const opensAbovePrevHigh = current.open! > previous.high!;
    const closesBelowMidpoint =
      current.close! < (previous.open! + previous.close!) / 2;
    const closesBelowOrEqualToOpen = current.close! <= previous.open!; // Changed from < to <=

    return (
      isPreviousBullish &&
      isCurrentBearish &&
      opensAbovePrevHigh &&
      closesBelowMidpoint &&
      closesBelowOrEqualToOpen // Changed condition name to reflect the change
    );
  }

  private isPiercingLine(current: PriceDTO, previous: PriceDTO): boolean {
    // Previous candle should be bearish (close < open)
    const isPreviousBearish = previous.close! < previous.open!;

    // Current candle should be bullish (close > open)
    const isCurrentBullish = current.close! > current.open!;

    // Current candle should open below previous low and close above midpoint of previous body
    const opensBelowPrevLow = current.open! < previous.low!;
    const closesAboveMidpoint =
      current.close! > (previous.open! + previous.close!) / 2;

    // Current close should be below previous open (not above)
    const closesBelowPreviousOpen = current.close! < previous.open!;

    return (
      isPreviousBearish &&
      isCurrentBullish &&
      opensBelowPrevLow &&
      closesAboveMidpoint &&
      closesBelowPreviousOpen
    );
  }

  private isMorningStar(c1: PriceDTO, c2: PriceDTO, c3: PriceDTO): boolean {
    // First candle should be bearish (c3)
    const isFirstBearish = c3.close! < c3.open!;

    // Second candle should be small (c2)
    const isSecondSmall =
      Math.abs(c2.close! - c2.open!) < Math.abs(c3.close! - c3.open!) * 0.3;

    // Third candle should be bullish (c1)
    const isThirdBullish = c1.close! > c1.open!;

    // Third candle should close at least into the first candle
    const closesIntoFirst = c1.close! > (c3.open! + c3.close!) / 2;

    return isFirstBearish && isSecondSmall && isThirdBullish && closesIntoFirst;
  }

  private isEveningStar(c1: PriceDTO, c2: PriceDTO, c3: PriceDTO): boolean {
    // First candle should be bullish (c3)
    const isFirstBullish = c3.close! > c3.open!;

    // Second candle should be small (c2)
    const isSecondSmall =
      Math.abs(c2.close! - c2.open!) < Math.abs(c3.close! - c3.open!) * 0.3;

    // Third candle should be bearish (c1)
    const isThirdBearish = c1.close! < c1.open!;

    // Third candle should close at least into the first candle
    const closesIntoFirst = c1.close! < (c3.open! + c3.close!) / 2;

    return isFirstBullish && isSecondSmall && isThirdBearish && closesIntoFirst;
  }

  private isThreeWhiteSoldiers(
    c1: PriceDTO,
    c2: PriceDTO,
    c3: PriceDTO,
  ): boolean {
    // All three candles should be bullish
    const allBullish =
      c1.close! > c1.open! && c2.close! > c2.open! && c3.close! > c3.open!;

    // Allow opens at or slightly above the previous close (within 1%)
    const c3Range = c3.close! - c3.open!;
    const c2Range = c2.close! - c2.open!;

    const properOpens =
      c2.open! > c3.open! &&
      c2.open! <= c3.close! * 1.01 && // Allow 1% flexibility
      c1.open! > c2.open! &&
      c1.open! <= c2.close! * 1.01; // Allow 1% flexibility

    // Each candle should close higher than the previous
    const higherCloses = c2.close! > c3.close! && c1.close! > c2.close!;

    // Small upper shadows (not more than 10% of body)
    const smallUpperShadows =
      c3.high! - c3.close! < 0.1 * Math.abs(c3.close! - c3.open!) &&
      c2.high! - c2.close! < 0.1 * Math.abs(c2.close! - c2.open!) &&
      c1.high! - c1.close! < 0.1 * Math.abs(c1.close! - c1.open!);

    return allBullish && properOpens && higherCloses && smallUpperShadows;
  }

  private isThreeBlackCrows(c1: PriceDTO, c2: PriceDTO, c3: PriceDTO): boolean {
    // All three candles should be bearish
    const allBearish =
      c1.close! < c1.open! && c2.close! < c2.open! && c3.close! < c3.open!;

    // Allow opens at or slightly below the previous close (within 1%)
    const properOpens =
      c2.open! < c3.open! &&
      c2.open! >= c3.close! * 0.99 && // Allow 1% flexibility
      c1.open! < c2.open! &&
      c1.open! >= c2.close! * 0.99; // Allow 1% flexibility

    // Each candle should close lower than the previous
    const lowerCloses = c2.close! < c3.close! && c1.close! < c2.close!;

    // Small lower shadows (not more than 10% of body)
    const smallLowerShadows =
      c3.close! - c3.low! < 0.1 * Math.abs(c3.close! - c3.open!) &&
      c2.close! - c2.low! < 0.1 * Math.abs(c2.close! - c2.open!) &&
      c1.close! - c1.low! < 0.1 * Math.abs(c1.close! - c1.open!);

    return allBearish && properOpens && lowerCloses && smallLowerShadows;
  }
}
