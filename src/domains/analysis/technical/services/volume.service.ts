import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';

interface VolumeProfile {}

@Injectable()
export class VolumeService {
  calculateVolumeProfile(prices: PriceDTO[], levels: number): VolumeProfile {
    return;
    // Impl Volume Profile
  }

  calculateOBV(prices: number[], volumes: number[]): number[] {
    return;
    // Impl On Balance Volume
  }

  calculateVolumeMA(volumes: number[], period: number): number[] {
    return;
    // Impl Volume Moving Average
  }
}
