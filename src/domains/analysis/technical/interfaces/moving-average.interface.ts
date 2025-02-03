export interface IMovingAverageService {
  calculateSMA(prices: number[], period: number): number[];
  calculateEMA(prices: number[], period: number): number[];
  detectCrossover(shortMA: number[], longMA: number[]): CrossoverResult;
}

export interface CrossoverResult {
  type: 'bullish' | 'bearish' | null;
  index: number;
  shortMA: number;
  longMA: number;
}
