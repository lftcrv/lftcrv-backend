export interface IndicatorDTO {
    timestamp: number;
    value: number;
    type: IndicatorType;
    signal?: 'buy' | 'sell' | 'neutral';
    strength?: number; // 0-1
}

export enum IndicatorType {
    SMA = 'SMA',
    EMA = 'EMA',
    RSI = 'RSI',
    MACD = 'MACD',
    // todo more
}