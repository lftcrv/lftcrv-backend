import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

@Injectable()
export class ADXService {
  calculateDMI(prices: PriceDTO[], period: number = 14) {
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      // True Range
      const high = prices[i].high!;
      const low = prices[i].low!;
      const prevClose = prices[i - 1].close!;

      tr.push(
        Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose),
        ),
      );

      // Directional Movement
      const upMove = high - prices[i - 1].high!;
      const downMove = prices[i - 1].low! - low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smoothed averages
    const smoothedTR = this.smoothSeries(tr, period);
    const smoothedPlusDM = this.smoothSeries(plusDM, period);
    const smoothedMinusDM = this.smoothSeries(minusDM, period);

    // Calculate DI
    const plusDI = smoothedPlusDM.map((pdm, i) => (pdm / smoothedTR[i]) * 100);
    const minusDI = smoothedMinusDM.map(
      (mdm, i) => (mdm / smoothedTR[i]) * 100,
    );

    return { plusDI, minusDI };
  }

  calculateADX(prices: PriceDTO[], period: number = 14) {
    const { plusDI, minusDI } = this.calculateDMI(prices, period);
    const dx: number[] = [];

    for (let i = 0; i < plusDI.length; i++) {
      const sum = Math.abs(plusDI[i] - minusDI[i]);
      const diff = Math.abs(plusDI[i] + minusDI[i]);
      dx.push((sum / diff) * 100);
    }

    const adx = this.smoothSeries(dx, period);
    return {
      adx: adx[adx.length - 1],
      plusDI: plusDI[plusDI.length - 1],
      minusDI: minusDI[minusDI.length - 1],
      trending: adx[adx.length - 1] > 25,
      sustainedPeriods: this.calculateSustainedPeriods(adx, 25),
    };
  }

  private smoothSeries(series: number[], period: number): number[] {
    const smoothed: number[] = [];
    let sum = series.slice(0, period).reduce((a, b) => a + b, 0);
    smoothed.push(sum / period);

    for (let i = period; i < series.length; i++) {
      sum = (smoothed[smoothed.length - 1] * (period - 1) + series[i]) / period;
      smoothed.push(sum);
    }
    return smoothed;
  }

  private calculateSustainedPeriods(
    values: number[],
    threshold: number,
  ): number {
    let periods = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] > threshold) periods++;
      else break;
    }
    return periods;
  }
}
