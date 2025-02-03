import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

@Injectable()
export class VolumeService {
  analyzeVolume(
    volumes: number[],
    prices: PriceDTO[],
    timeframe: string = '1h',
  ) {
    if (!volumes.length || !prices.length) {
      throw new Error('Volume and price data required');
    }

    const period = this.getPeriodForTimeframe(timeframe);

    // Compute the average of previous volumes, excluding the last one
    const avgVolume = this.calculateAverageVolume(volumes.slice(0, -1), period);
    const currentVolume = volumes[volumes.length - 1];

    const volumeProfile = this.calculateVolumeProfile(volumes, prices);
    const trendStrength = this.calculateTrendStrength(volumes, period);

    return {
      trend: {
        direction: this.getVolumeTrend(trendStrength),
        strength: Math.abs(trendStrength), // 0-1 normalized strength
      },
      significance: avgVolume > 0 ? Math.min(currentVolume / avgVolume, 1) : 1, // Fix significance
      profile: {
        dominantLevel: volumeProfile.dominantPrice,
        concentration: volumeProfile.concentration, // 0-1 normalized concentration
      },
    };
  }

  private getPeriodForTimeframe(timeframe: string): number {
    const periods = {
      '1m': 30, // 30 minutes
      '5m': 24, // 2 hours
      '15m': 16, // 4 hours
      '1h': 24, // 1 day
      '4h': 30, // 5 days
      '1d': 20, // 1 month
    };
    return periods[timeframe] || 20;
  }

  private calculateAverageVolume(volumes: number[], period: number): number {
    const actualPeriod = Math.min(period, volumes.length);
    if (actualPeriod < 2) return volumes[volumes.length - 1] || 0; // Use last value if only 1 exists

    const recentVolumes = volumes.slice(-actualPeriod);
    return recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  }

  private calculateVolumeProfile(volumes: number[], prices: PriceDTO[]) {
    // Group volumes by price levels
    const priceVolumes = new Map<number, number>();
    let totalVolume = 0;

    prices.forEach((price, i) => {
      const priceLevel = Math.round(price.close! / 10) * 10;
      const volume = volumes[i];
      priceVolumes.set(
        priceLevel,
        (priceVolumes.get(priceLevel) || 0) + volume,
      );
      totalVolume += volume;
    });

    // Find dominant price level and calculate concentration
    let maxVolume = 0;
    let dominantPrice = prices[0].close!;

    priceVolumes.forEach((volume, price) => {
      if (volume > maxVolume) {
        maxVolume = volume;
        dominantPrice = price;
      }
    });

    // Calculate volume concentration (how much volume is at dominant level)
    const concentration = Math.min((maxVolume / totalVolume) * 3, 1); // Normalized to 0-1

    return {
      dominantPrice,
      concentration,
    };
  }

  private calculateTrendStrength(volumes: number[], period: number): number {
    const minRequired = Math.max(3, Math.min(period, volumes.length)); // Require at least 3 points
    if (volumes.length < minRequired) return 0; // Not enough data

    const actualPeriod = Math.min(period, volumes.length);
    const recent = volumes.slice(-actualPeriod);
    if (recent.length < 2) return 0;

    const half = Math.floor(actualPeriod / 2);
    if (half < 1) return 0; // Still not enough data to split

    const firstHalf = recent.slice(0, actualPeriod - half);
    const secondHalf = recent.slice(actualPeriod - half);

    const ma1 = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const ma2 = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    let change = (ma2 - ma1) / ma1;
    return Math.max(Math.min(isFinite(change) ? change : 0, 1), -1);
  }

  private getVolumeTrend(
    strength: number,
  ): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 0.05; // More sensitive to minor trends
    if (strength > threshold) return 'increasing';
    if (strength < -threshold) return 'decreasing';
    return 'stable';
  }
}
