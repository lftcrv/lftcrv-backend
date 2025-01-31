// import { Injectable } from '@nestjs/common';
// import { PriceDTO } from '../dto/price.dto';

// interface Trendline {
//   start: { price: number; index: number };
//   end: { price: number; index: number };
//   strength: number; // 0-1
//   type: 'support' | 'resistance';
// }

// @Injectable()
// export class SupportResistanceService {
//   findKeyLevels(prices: PriceDTO[]): number[] {
//     if (prices.length < 10) return [];
//     const stepSize = this.adaptiveStepSize(prices);

//     // 2) Find simple pivot highs and lows (peak/valley detection)
//     const pivots = this.findPivots(prices);

//     // 3) Aggregate pivots by rounding to the nearest "stepSize"
//     const levels = new Map<number, number>();
//     pivots.forEach((price) => {
//       const roundedPrice = Math.round(price / stepSize) * stepSize;
//       levels.set(roundedPrice, (levels.get(roundedPrice) || 0) + 1);
//     });

//     // 4) Filter out levels that are not touched frequently enough
//     const significantLevels: number[] = [];
//     const threshold = Math.max(3, Math.floor(prices.length * 0.05)); // e.g. 5% of data length
//     levels.forEach((count, price) => {
//       if (count >= threshold) {
//         significantLevels.push(price);
//       }
//     });

//     return significantLevels.sort((a, b) => a - b);
//   }

//   identifyTrendlines(prices: PriceDTO[]): Trendline[] {
//     if (prices.length < 20) return [];

//     // Find pivot highs / pivot lows using a rolling window approach
//     const pivotHighs = this.findPivotPoints(prices, 'high');
//     const pivotLows = this.findPivotPoints(prices, 'low');
//     const trendlines: Trendline[] = [];

//     // 1) Identify potential resistance lines from pivot highs
//     for (let i = 0; i < pivotHighs.length - 1; i++) {
//       for (let j = i + 1; j < pivotHighs.length; j++) {
//         const line = this.createTrendline(
//           pivotHighs[i],
//           i,
//           pivotHighs[j],
//           j,
//           'resistance',
//         );
//         if (this.validateTrendline(line, prices)) {
//           trendlines.push(line);
//         }
//       }
//     }

//     // 2) Identify potential support lines from pivot lows
//     for (let i = 0; i < pivotLows.length - 1; i++) {
//       for (let j = i + 1; j < pivotLows.length; j++) {
//         const line = this.createTrendline(
//           pivotLows[i],
//           i,
//           pivotLows[j],
//           j,
//           'support',
//         );
//         if (this.validateTrendline(line, prices)) {
//           trendlines.push(line);
//         }
//       }
//     }

//     // Filter and return the top 5 strongest trendlines
//     return this.filterTrendlines(trendlines);
//   }

//   validateLevel(level: number, prices: PriceDTO[], volumes: number[]): boolean {
//     if (prices.length < 5) return false;

//     // 0.2% price tolerance
//     const tolerance = Math.abs(level * 0.002);
//     let touches = 0;
//     let significantVolume = false;

//     // Compute average volume and standard deviation
//     const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
//     const stdDev = Math.sqrt(
//       volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) /
//         volumes.length,
//     );
//     const volumeThreshold = avgVolume + stdDev;

//     // Count how many times price touches (within tolerance)
//     // And if there's higher-than-(avg+stdDev) volume
//     for (let i = 0; i < prices.length; i++) {
//       const price = prices[i].close!;
//       if (Math.abs(price - level) <= tolerance) {
//         touches++;
//         if (volumes[i] > volumeThreshold) {
//           significantVolume = true;
//         }
//       }
//     }

//     // Require at least 3 touches and at least one instance of significant volume
//     return touches >= 3 && significantVolume;
//   }

//   /**
//    * -------------------
//    *  Private Helpers
//    * -------------------
//    */

//   /**
//    * Simple peak/valley detection: A pivot is a local max or min:
//    * current > prev && current > next, or
//    * current < prev && current < next
//    */
//   private findPivots(prices: PriceDTO[]): number[] {
//     const pivots: number[] = [];
//     for (let i = 1; i < prices.length - 1; i++) {
//       const curr = prices[i].close!;
//       const prev = prices[i - 1].close!;
//       const next = prices[i + 1].close!;

//       if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
//         pivots.push(curr);
//       }
//     }
//     return pivots;
//   }

//   /**
//    * Finds pivot points (high or low) using a rolling window approach.
//    * For pivot 'high', current bar must be >= every high in prevWindow & nextWindow.
//    * For pivot 'low', current bar must be <= every low in prevWindow & nextWindow.
//    */
//   private findPivotPoints(prices: PriceDTO[], type: 'high' | 'low'): number[] {
//     const pivots: number[] = [];
//     const window = 5;

//     for (let i = window; i < prices.length - window; i++) {
//       const current = type === 'high' ? prices[i].high! : prices[i].low!;
//       const prevWindow = prices.slice(i - window, i);
//       const nextWindow = prices.slice(i + 1, i + window + 1);

//       if (type === 'high') {
//         if (
//           prevWindow.every((p) => current >= p.high!) &&
//           nextWindow.every((p) => current >= p.high!)
//         ) {
//           pivots.push(current);
//         }
//       } else {
//         if (
//           prevWindow.every((p) => current <= p.low!) &&
//           nextWindow.every((p) => current <= p.low!)
//         ) {
//           pivots.push(current);
//         }
//       }
//     }
//     return pivots;
//   }

//   /**
//    * Create a trendline between two pivot points
//    */
//   private createTrendline(
//     price1: number,
//     index1: number,
//     price2: number,
//     index2: number,
//     type: 'support' | 'resistance',
//   ): Trendline {
//     const slope = (price2 - price1) / (index2 - index1);
//     const strength = Math.min(Math.abs(slope), 1); // Keep strength in [0,1]
//     return {
//       start: { price: price1, index: index1 },
//       end: { price: price2, index: index2 },
//       strength,
//       type,
//     };
//   }

//   /**
//    * Make slope tolerance adaptive based on the number of touches.
//    * This way, trendlines with more touches may allow a steeper slope.
//    */
//   private validateTrendline(line: Trendline, prices: PriceDTO[]): boolean {
//     const touches = this.countTrendlineTouches(line, prices);
//     const slope = Math.abs(
//       (line.end.price - line.start.price) / (line.end.index - line.start.index),
//     );

//     // More touches allow a higher slope tolerance
//     const maxSlope = 0.3 + touches * 0.05;

//     return touches >= 3 && slope <= maxSlope;
//   }

//   /**
//    * Count how many bars "touch" this trendline within a small tolerance
//    */
//   private countTrendlineTouches(line: Trendline, prices: PriceDTO[]): number {
//     let touches = 0;
//     const slope =
//       (line.end.price - line.start.price) / (line.end.index - line.start.index);
//     const intercept = line.start.price - slope * line.start.index;
//     // 0.2% tolerance based on the line's starting price
//     const tolerance = Math.abs(line.start.price * 0.002);

//     for (let i = line.start.index; i <= line.end.index; i++) {
//       const expectedPrice = slope * i + intercept;
//       const actualPrice =
//         line.type === 'resistance' ? prices[i].high! : prices[i].low!;

//       if (Math.abs(actualPrice - expectedPrice) <= tolerance) {
//         touches++;
//       }
//     }
//     return touches;
//   }

//   /**
//    * Sort trendlines by descending strength and keep only the top 5
//    */
//   private filterTrendlines(trendlines: Trendline[]): Trendline[] {
//     return trendlines.sort((a, b) => b.strength - a.strength).slice(0, 5);
//   }

//   /**
//    * Compute an adaptive step size for rounding,
//    * based on the overall min & max close prices.
//    */
//   private adaptiveStepSize(prices: PriceDTO[]): number {
//     const closes = prices.map((p) => p.close!);
//     const minPrice = Math.min(...closes);
//     const maxPrice = Math.max(...closes);
//     // ex: divide the total range into 100 "buckets"
//     return (maxPrice - minPrice) / 100 || 1; // Fallback to 1 if range=0
//   }
// }
