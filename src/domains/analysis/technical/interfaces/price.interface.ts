import { PriceDTO } from '../dto/price.dto';
import { TimeFrame } from '../types';

/**
 * Base options for price data retrieval
 */
export interface BasePriceOptions {
  limit?: number;
  startTime?: number;
  endTime?: number;
  priceKind?: string;
}

/**
 * Interface defining the contract for price services
 * Implemented by both ParadexPriceService and AvnuPriceService
 */
export interface IPriceService {
  /**
   * Fetches historical price data
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Array of price data
   */
  getHistoricalPrices(
    identifier: string,
    timeframe: TimeFrame,
    options?: BasePriceOptions
  ): Promise<PriceDTO[]>;

  /**
   * Fetches current price for a token
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param options Price type options
   * @returns Current price
   */
  getCurrentPrice(
    identifier: string,
    options?: { priceKind?: string }
  ): Promise<number>;

  /**
   * Helper method to get the last n candles. (and prices for AVNU)
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param number Number of candles to retrieve
   * @param timeframe Candle timeframe
   */
  getLastCandles(
    identifier: string,
    number: number,
    timeframe: TimeFrame
  ): Promise<PriceDTO[]>;

  /**
   * Retrieves prices for a specific time period
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param timeframe Candle timeframe
   * @param startTime Start timestamp
   * @param endTime End timestamp
   */
  getPricesInPeriod(
    identifier: string,
    timeframe: TimeFrame,
    startTime: number,
    endTime: number
  ): Promise<PriceDTO[]>;
}