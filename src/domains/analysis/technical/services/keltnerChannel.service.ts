import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";
import { ATRService } from "./atr.service";
import { MovingAverageService } from "./moving-average.service";

@Injectable()
export class KeltnerChannelService {
    calculateKeltnerChannels(
      prices: PriceDTO[],
      emaPeriod: number = 20,
      atrPeriod: number = 10,
      multiplier: number = 2
    ): { middle: number[], upper: number[], lower: number[] } {
      // Create moving average service and ATR service instances
      const maService = new MovingAverageService();
      const atrService = new ATRService();
      
      // Calculate the middle line (EMA)
      const ema = maService.calculateEMA(prices, emaPeriod);
      
      // Calculate ATR
      const atr = atrService.calculateATR(prices, atrPeriod);
      
      // Calculate upper and lower bands
      const upper: number[] = [];
      const lower: number[] = [];
      
      // Adjust indices because ATR has one fewer point
      for (let i = 0; i < ema.length; i++) {
        if (i < atr.length) {
          upper.push(ema[i] + (multiplier * atr[i]));
          lower.push(ema[i] - (multiplier * atr[i]));
        }
      }
      
      return { middle: ema, upper, lower };
    }
    
    getChannelSignal(
      price: number,
      upper: number,
      lower: number
    ): 'overbought' | 'oversold' | 'neutral' {
      if (price > upper) return 'overbought';
      if (price < lower) return 'oversold';
      return 'neutral';
    }
  }