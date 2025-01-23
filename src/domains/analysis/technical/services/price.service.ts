import { Injectable } from "@nestjs/common";
import { PriceDTO } from "../dto/price.dto";

@Injectable()
export class PriceService {
    constructor(
    ) {}

    async getCurrentPrice(token: string): Promise<number> {
        return;
    }

    async getHistoricalPrices(
        token: string, 
        timeframe: string
    ): Promise<PriceDTO[]> {
        return
    }
}

