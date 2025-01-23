import { IndicatorType } from "../types";

export interface IndicatorDTO {
    timestamp: number;
    value: number;
    type: IndicatorType;
    signal?: 'buy' | 'sell' | 'neutral';
    strength?: number; // 0-1
}