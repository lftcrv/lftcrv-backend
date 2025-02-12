import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../../dto/price.dto';
import { TimeFrame } from '../../types';
import { IPriceService, BasePriceOptions } from '../../interfaces/price.interface';
import axios from 'axios';

/**
 * Market information structure
 */
export interface MarketInfo {
  symbol: string;      // Full market symbol (e.g., BTC-USD-PERP)
  baseAsset: string;   // Base currency (e.g., BTC)
  quoteAsset: string;  // Quote currency (e.g., USD)
  contractType: string; // Contract type (e.g., PERP for perpetual)
}

@Injectable()
export class ParadexPriceService implements IPriceService {
  private readonly baseUrl = 'https://api.testnet.paradex.trade/v1';

  private readonly supportedTimeframes = ['1', '3', '5', '15', '30', '60'];

  // Mapping of timeframes to their duration in minutes
  private readonly timeframeToMinutes: Record<TimeFrame, number> = {
    '1m': 1,
    '3m': 3,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
  };

  private readonly minutesToTimeframe: Record<string, TimeFrame> = {
    '1': '1m',
    '3': '3m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
  };

  /**
   * Constructs market symbol and information from token name
   * @param identifier Base token (e.g., "BTC")
   * @returns Market information object
   */
  private getMarketSymbol(identifier: string): MarketInfo {
    const baseAsset = identifier.toUpperCase();
    return {
      symbol: `${baseAsset}-USD-PERP`,
      baseAsset,
      quoteAsset: 'USD',
      contractType: 'PERP',
    };
  }

  /**
   * Converts timeframe to API format
   * @param timeframe Our timeframe format (e.g., '1h')
   * @returns API format (e.g., '60')
   */
  private convertTimeframeToApiFormat(timeframe: TimeFrame): string {
    const minutes = this.timeframeToMinutes[timeframe];
    if (!minutes) {
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
    if (!this.supportedTimeframes.includes(minutes.toString())) {
      throw new Error(
        `Timeframe ${timeframe} (${minutes} minutes) is not supported by the API. Supported timeframes: ${this.supportedTimeframes.map((t) => this.minutesToTimeframe[t]).join(', ')}`,
      );
    }
    return minutes.toString();
  }

  /**
   * Fetches historical price data
   * @param identifier Base token (e.g., "BTC")
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Array of price data
   */
  async getHistoricalPrices(
    identifier: string,
    timeframe: TimeFrame,
    options: BasePriceOptions = {},
  ): Promise<PriceDTO[]> {
    const { limit = 100, endTime = Date.now(), startTime, priceKind } = options;

    const apiTimeframe = this.convertTimeframeToApiFormat(timeframe);
    const market = this.getMarketSymbol(identifier);

    // Calculate start time if not given
    const minutesInTimeframe = this.timeframeToMinutes[timeframe];
    const calculatedStartTime =
      startTime || endTime - minutesInTimeframe * 60 * 1000 * limit;

    const params: Record<string, any> = {
      symbol: market.symbol,
      resolution: apiTimeframe,
      start_at: calculatedStartTime,
      end_at: endTime,
    };

    if (priceKind) {
      params.price_kind = priceKind;
    }

    const response = await axios.get(`${this.baseUrl}/markets/klines`, {
      params,
    });

    if (!response.data || !Array.isArray(response.data.results)) {
      throw new Error('Invalid response format from API');
    }

    const prices = response.data.results.map((candle: any) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      price: parseFloat(candle[4]),
    }));

    if (prices.length > limit) {
      return prices.slice(-limit);
    }

    return prices;
  }

  /**
   * Fetches current price for a token
   * @param identifier Base token (e.g., "BTC")
   * @param options Price type options
   * @returns Current price
   */
  async getCurrentPrice(
    identifier: string,
    options: { priceKind?: 'mark' | 'index' | 'last' } = {},
  ): Promise<number> {
    try {
      const market = this.getMarketSymbol(identifier);
      const response = await axios.get(`${this.baseUrl}/markets/summary`, {
        params: { market: market.symbol },
      });

      const result = response.data.results[0];

      switch (options.priceKind) {
        case 'mark':
          return parseFloat(result.mark_price);
        case 'index':
          return parseFloat(result.underlying_price);
        case 'last':
          return parseFloat(result.last_traded_price);
        default:
          return parseFloat(result.mark_price);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper method to get the last n candles
   * @param identifier Base token (e.g., "BTC")
   * @param number Number of candles to retrieve
   * @param timeframe Candle timeframe
   */
  async getLastCandles(
    identifier: string,
    number: number,
    timeframe: TimeFrame,
  ): Promise<PriceDTO[]> {
    return this.getHistoricalPrices(identifier, timeframe, { limit: number });
  }

  /**
   * Retrieves prices for a specific time period
   * @param identifier Base token (e.g., "BTC")
   * @param timeframe Candle timeframe
   * @param startTime Start timestamp
   * @param endTime End timestamp
   */
  async getPricesInPeriod(
    identifier: string,
    timeframe: TimeFrame,
    startTime: number,
    endTime: number,
  ): Promise<PriceDTO[]> {
    return this.getHistoricalPrices(identifier, timeframe, { startTime, endTime });
  }
}