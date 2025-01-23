export interface IMomentumService {
  calculateRSI(prices: number[], period?: number): number[];
  calculateMACD(
    prices: number[],
    shortPeriod?: number,
    longPeriod?: number,
    signalPeriod?: number,
  ): MACDResult;
  calculateStochastic(
    high: number[],
    low: number[],
    close: number[],
    period?: number,
  ): StochasticResult;
}

export interface MACDResult {
  macd: number[]; // MACD line
  signal: number[]; // Signal line (EMA of MACD)
  histogram: number[]; // MACD - Signal
}

export interface StochasticResult {
  k: number[]; // Fast stochastic (%K)
  d: number[]; // Slow stochastic (%D)
}
