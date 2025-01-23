import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";

interface Trendline {}

@Injectable()
export class SupportResistanceService {
    findKeyLevels(prices: PriceDTO[]): number[] {
        return
        // Impl key lvl detection
    }

    identifyTrendlines(prices: PriceDTO[]): Trendline[] {
        return
        // Impl trendlines detection
    }

    validateLevel(
        level: number, 
        prices: PriceDTO[], 
        volume: number[]
    ): boolean {
        return
        // Impl validate lvl
    }
}