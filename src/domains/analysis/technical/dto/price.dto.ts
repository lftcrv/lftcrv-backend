export interface BasePriceDTO {
    timestamp: number;
    price: number;
}

export interface PriceDTO extends BasePriceDTO {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
}