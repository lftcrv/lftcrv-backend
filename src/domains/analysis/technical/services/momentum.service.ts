import { Injectable } from "@nestjs/common";

interface MACDResult {}
interface StochasticResult {}

@Injectable()
export class MomentumService {
    calculateRSI(prices: number[], period: number = 14): number[] {
        return
        // Impl RSI
    }

    calculateMACD(
        prices: number[],
        shortPeriod = 12,
        longPeriod = 26,
        signalPeriod = 9
    ): MACDResult {
        return
        // Impl MACD
    }

    calculateStochastic(
        high: number[],
        low: number[],
        close: number[],
        period: number = 14
    ): StochasticResult {
        return
        // Impl Stochastic
    }
}