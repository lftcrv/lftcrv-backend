import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";

@Injectable()
export class VolumeService {
  analyzeVolume(volumes: number[], prices: PriceDTO[], timeframe: string = '1h') {
    if (!volumes.length || !prices.length) {
      throw new Error('Volume and price data required');
    }

    const period = this.getPeriodForTimeframe(timeframe);
    const avgVolume = this.calculateAverageVolume(volumes, period);
    const currentVolume = volumes[volumes.length - 1];

    const volumeProfile = this.calculateVolumeProfile(volumes, prices);
    const trendStrength = this.calculateTrendStrength(volumes, period);

    return {
      trend: {
        direction: this.getVolumeTrend(trendStrength),
        strength: Math.abs(trendStrength)  // 0-1 normalized strength
      },
      significance: Math.min(currentVolume / avgVolume, 1),  // Volume relative to average
      profile: {
        dominantLevel: volumeProfile.dominantPrice,
        concentration: volumeProfile.concentration  // 0-1 normalized concentration
      }
    };
  }

  private getPeriodForTimeframe(timeframe: string): number {
    const periods = {
      '1m': 30,   // 30 minutes
      '5m': 24,   // 2 hours
      '15m': 16,  // 4 hours
      '1h': 24,   // 1 day
      '4h': 30,   // 5 days
      '1d': 20    // 1 month
    };
    return periods[timeframe] || 20;
  }

  private calculateAverageVolume(volumes: number[], period: number): number {
    const recentVolumes = volumes.slice(-period);
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
        (priceVolumes.get(priceLevel) || 0) + volume
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
    const concentration = Math.min(maxVolume / totalVolume * 3, 1); // Normalized to 0-1

    return {
      dominantPrice,
      concentration
    };
  }

  private calculateTrendStrength(volumes: number[], period: number): number {
    const recent = volumes.slice(-period);
    if (recent.length < 2) return 0;

    const ma1 = this.calculateAverageVolume(recent.slice(0, -period/2), period/2);
    const ma2 = this.calculateAverageVolume(recent.slice(-period/2), period/2);
    
    // Calculate normalized trend strength
    const change = (ma2 - ma1) / ma1;
    return Math.max(Math.min(change, 1), -1);  // Normalize to [-1, 1]
  }

  private getVolumeTrend(strength: number): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 0.1;  // More lenient threshold
    if (strength > threshold) return 'increasing';
    if (strength < -threshold) return 'decreasing';
    return 'stable';
  }
}