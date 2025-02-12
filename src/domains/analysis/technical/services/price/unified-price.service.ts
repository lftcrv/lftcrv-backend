import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../../dto/price.dto';
import { TimeFrame } from '../../types';
import { IPriceService, BasePriceOptions } from '../../interfaces/price.interface';
import { ParadexPriceService } from './paradex-price.service';
import { AvnuPriceService } from './avnu-price.service';

/**
 * Platform type for price data source
 */
export type Platform = 'paradex' | 'avnu';

/**
 * Extended options including platform selection
 */
export interface UnifiedPriceOptions extends BasePriceOptions {
  platform: Platform;
}

@Injectable()
export class UnifiedPriceService {
  constructor(
    private readonly paradexService: ParadexPriceService,
    private readonly avnuService: AvnuPriceService
  ) {}

  /**
   * Gets the appropriate price service based on platform
   * @param platform The trading platform to use
   * @returns The corresponding price service
   */
  private getPriceService(platform: Platform): IPriceService {
    switch (platform) {
      case 'paradex':
        return this.paradexService;
      case 'avnu':
        return this.avnuService;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Fetches historical price data from specified platform
   * @param platform Trading platform to use
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Array of price data
   */
  async getHistoricalPrices(
    platform: 'paradex' | 'avnu',
    identifier: string,
    timeframe: TimeFrame,
    options: BasePriceOptions = {},
  ): Promise<PriceDTO[]> {
    if (platform !== 'paradex' && platform !== 'avnu') {
        throw new Error(`Unsupported platform: ${platform}. Must be either paradex or avnu`);
    }
    const service = platform === 'paradex' ? this.paradexService : this.avnuService;
    return service.getHistoricalPrices(identifier, timeframe, options);
  }

  /**
   * Fetches current price from specified platform
   * @param platform Trading platform to use
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param options Price type options
   * @returns Current price
   */
  async getCurrentPrice(
    platform: Platform,
    identifier: string,
    options: { priceKind?: string } = {},
  ): Promise<number> {
    const service = this.getPriceService(platform);
    return service.getCurrentPrice(identifier, options);
  }

  /**
   * Helper method to get the last n candles from specified platform
   * @param platform Trading platform to use
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param number Number of candles to retrieve
   * @param timeframe Candle timeframe
   */
  async getLastCandles(
    platform: Platform,
    identifier: string,
    number: number,
    timeframe: TimeFrame,
  ): Promise<PriceDTO[]> {
    const service = this.getPriceService(platform);
    return service.getLastCandles(identifier, number, timeframe);
  }

  /**
   * Retrieves prices for a specific time period from specified platform
   * @param platform Trading platform to use
   * @param identifier Token identifier (symbol for Paradex, address for AVNU)
   * @param timeframe Candle timeframe
   * @param startTime Start timestamp
   * @param endTime End timestamp
   */
  async getPricesInPeriod(
    platform: Platform,
    identifier: string,
    timeframe: TimeFrame,
    startTime: number,
    endTime: number,
  ): Promise<PriceDTO[]> {
    const service = this.getPriceService(platform);
    return service.getPricesInPeriod(identifier, timeframe, startTime, endTime);
  }

  /**
   * Fetches price data from multiple platforms in parallel
   * @param identifiers Map of platform to token identifiers
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Object mapping platforms to their price data
   */
  async getMultiPlatformPrices(
    identifiers: Record<Platform, string>,
    timeframe: TimeFrame,
    options: BasePriceOptions = {},
  ): Promise<Record<Platform, PriceDTO[]>> {
    const tasks = Object.entries(identifiers).map(async ([platform, identifier]) => {
      const data = await this.getHistoricalPrices(
        platform as Platform,
        identifier,
        timeframe,
        options
      );
      return [platform, data];
    });

    const results = await Promise.all(tasks);
    return Object.fromEntries(results);
  }
}