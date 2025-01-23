import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";

interface CandlePattern{}; //TODO

@Injectable()
export class CandlestickService {
    analyzeCandlestick(candle: PriceDTO): CandlePattern[] {
        // return [
        //     this.checkDoji(candle),
        //     this.checkHammer(candle),
        //     this.checkEngulfing(candle)
        // ].filter(Boolean);
        return
    }

    private checkDoji(candle: PriceDTO): CandlePattern | null {
        return
        // Impl pattern Doji
    }
    // other patterns
}