import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../dto/price.dto';
import axios from 'axios';
import { TimeFrame } from '../types';

// Configuration options for price retrieval
export interface PriceOptions {
  limit?: number;     // Number of candles to retrieve (default: 100)
  startTime?: number; // Specific start timestamp (if not provided, calculated from limit)
  endTime?: number;   // End timestamp (default: current time)
  
  priceKind?: 'mark' | 'index' | 'last';    // Type of price to use
}

// Market information structure
export interface MarketInfo {
  symbol: string;        // Full market symbol (e.g., BTC-USD-PERP)
  baseAsset: string;     // Base currency (e.g., BTC)
  quoteAsset: string;    // Quote currency (e.g., USD)
  contractType: string;  // Contract type (e.g., PERP for perpetual)
}

@Injectable()
export class PriceService {
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
   * @param token Base token (e.g., "BTC")
   * @returns Market information object
   */
  private getMarketSymbol(token: string): MarketInfo {
    const baseAsset = token.toUpperCase();
    return {
      symbol: `${baseAsset}-USD-PERP`,
      baseAsset,
      quoteAsset: 'USD',
      contractType: 'PERP'
    };
  }

  /**
   * Convertit notre timeframe en format API
   * @param timeframe Notre format de timeframe (e.g., '1h')
   * @returns Format API (e.g., '60')
   */
  private convertTimeframeToApiFormat(timeframe: TimeFrame): string {
    const minutes = this.timeframeToMinutes[timeframe];
    if (!minutes) {
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
    if (!this.supportedTimeframes.includes(minutes.toString())) {
      throw new Error(`Timeframe ${timeframe} (${minutes} minutes) is not supported by the API. Supported timeframes: ${this.supportedTimeframes.map(t => this.minutesToTimeframe[t]).join(', ')}`);
    }
    return minutes.toString();
  }

  /**
   * Fetches historical price data with various options
   * @param token Base token (e.g., "BTC")
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Array of price data
   */
  async getHistoricalPrices(
    token: string,
    timeframe: TimeFrame,
    options: PriceOptions = {}
  ): Promise<PriceDTO[]> {
    const {
      limit = 100,
      endTime = Date.now(),
      startTime,
      priceKind,
    } = options;

    const apiTimeframe = this.convertTimeframeToApiFormat(timeframe);
    const market = this.getMarketSymbol(token);
    
    // Calculate start time if not given
    const minutesInTimeframe = this.timeframeToMinutes[timeframe];
    const calculatedStartTime = startTime || 
      endTime - (minutesInTimeframe * 60 * 1000 * limit);

    const params: Record<string, any> = {
      symbol: market.symbol,
      resolution: apiTimeframe,
      start_at: calculatedStartTime,
      end_at: endTime
    };

    if (priceKind) {
      params.price_kind = priceKind;
    }

    const response = await axios.get(`${this.baseUrl}/markets/klines`, { params });

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
      price: parseFloat(candle[4])
    }));

    if (prices.length > limit) {
      return prices.slice(-limit);
    }

    return prices;
  }

  /**
   * Fetches current price for a token
   * @param token Base token (e.g., "BTC")
   * @param options Price type options
   * @returns Current price
   */
  async getCurrentPrice(
    token: string, 
    options: { priceKind?: 'mark' | 'index' | 'last' } = {}
  ): Promise<number> {
    try {
      const market = this.getMarketSymbol(token);
      const response = await axios.get(`${this.baseUrl}/markets/summary`, {
        params: { market: market.symbol }
      });

      const result = response.data.results[0];
      
      // Return requested price type
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
   * Helper method to get the last n candles up to now
   * @param token Base token (e.g., "BTC")
   * @param number Number of candles to retrieve
   * @param timeframe Candle timeframe
   */
  async getLastCandles(
    token: string,
    number: number,
    timeframe: TimeFrame
  ): Promise<PriceDTO[]> {
    return this.getHistoricalPrices(token, timeframe, { limit: number });
  }

  /**
   * Retrieves candles for a specific time period
   * @param token Base token (e.g., "BTC")
   * @param timeframe Candle timeframe
   * @param startTime Start timestamp
   * @param endTime End timestamp
   */
  async getPricesInPeriod(
    token: string,
    timeframe: TimeFrame,
    startTime: number,
    endTime: number
  ): Promise<PriceDTO[]> {
    return this.getHistoricalPrices(token, timeframe, { startTime, endTime });
  }

  /**
   * Retrieves candles from a specific date until now
   * @param token Base token (e.g., "BTC")
   * @param timeframe Candle timeframe
   * @param startTime Start timestamp
   */
  async getPricesFromDate(
    token: string,
    timeframe: TimeFrame,
    startTime: number
  ): Promise<PriceDTO[]> {
    return this.getHistoricalPrices(token, timeframe, { startTime });
  }
}