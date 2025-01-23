import { Injectable } from "@nestjs/common";
import { CandlestickService } from "./services/candlestick.service";
import { MomentumService } from "./services/momentum.service";
import { MovingAverageService } from "./services/moving-average.service";
import { PriceService } from "./services/price.service";
import { SupportResistanceService } from "./services/support-resistance.service";
import { VolumeService } from "./services/volume.service";

interface TechnicalAnalysis {};

@Injectable()
export class TechnicalService {
    constructor(
        private priceService: PriceService,
        private candlestickService: CandlestickService,
        private maService: MovingAverageService,
        private momentumService: MomentumService,
        private volumeService: VolumeService,
        private srService: SupportResistanceService
    ) {}

    async analyzeTechnicals(
        token: string, 
        timeframe: string
    ): Promise<TechnicalAnalysis> {
        // Fetch prices
        const prices = await this.priceService.getHistoricalPrices(token, timeframe);
        
        // Do the whole analysis
        const analysis = {
            patterns: this.candlestickService.analyzeCandlestick(prices),
            movingAverages: {
                sma: this.maService.calculateSMA(prices.map(p => p.close), 20),
                ema: this.maService.calculateEMA(prices.map(p => p.close), 20)
            },
            momentum: {
                rsi: this.momentumService.calculateRSI(prices.map(p => p.close)),
                macd: this.momentumService.calculateMACD(prices.map(p => p.close))
            },
            volume: {
                obv: this.volumeService.calculateOBV(
                    prices.map(p => p.close),
                    prices.map(p => p.volume)
                ),
                profile: this.volumeService.calculateVolumeProfile(prices, 10)
            },
            levels: this.srService.findKeyLevels(prices)
        };

        return this.aggregateSignals(analysis);
    }

    private aggregateSignals(analysis: any): TechnicalAnalysis {
        return
        // Combine all signals into a coherent analysis
        // Weight the various indicators
        // Generate trading signals
    }
}