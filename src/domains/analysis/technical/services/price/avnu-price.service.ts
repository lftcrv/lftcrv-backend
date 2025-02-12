import { Injectable } from '@nestjs/common';
import { PriceDTO } from '../../dto/price.dto';
import { TimeFrame } from '../../types';
import { IPriceService, BasePriceOptions } from '../../interfaces/price.interface';
import { AvnuToken, AVNU_TOKENS } from '../../config/tokens.config';
import axios from 'axios';

@Injectable()
export class AvnuPriceService implements IPriceService {
  private readonly baseUrl = 'https://starknet.impulse.avnu.fi/v1';
  private readonly tokenMap: Map<string, string> = new Map();
  private readonly reverseTokenMap: Map<string, string> = new Map();

  private readonly timeframeToAvnuFormat: Record<TimeFrame, string> = {
    '1m': '1',
    '3m': '5',  // AVNU doesn't have 3 min timeframe, we use 5
    '5m': '5',
    '15m': '15',
    '30m': '15', // AVNU doesn't have 30 min timeframe, we use 15
    '1h': '1H'
  };

  constructor() {
    // Initialiser les mappings des tokens
    AVNU_TOKENS.forEach(token => {
      this.tokenMap.set(token.name.toUpperCase(), token.address);
      this.reverseTokenMap.set(token.address, token.name.toUpperCase());
    });
  }

  /**
   * Converts our timeframe format to AVNU format
   */
  private convertTimeframeToAvnuFormat(timeframe: TimeFrame): string {
    const avnuTimeframe = this.timeframeToAvnuFormat[timeframe];
    if (!avnuTimeframe) {
      throw new Error(`Timeframe not supported by AVNU: ${timeframe}`);
    }
    return avnuTimeframe;
  }

  getTokenAddress(name: string): string {
    const address = this.tokenMap.get(name.toUpperCase());
    if (!address) {
      throw new Error(`Token ${name} not found on AVNU`);
    }
    return address;
  }

  getTokenName(address: string): string {
    return this.reverseTokenMap.get(address) || address;
  }

  /**
   * Fetches historical price data
   * @param identifier Token contract address
   * @param timeframe Candle timeframe
   * @param options Configuration options
   * @returns Array of price data
   */
  async getHistoricalPrices(
    identifier: string,
    timeframe: TimeFrame,
    options: BasePriceOptions = {},
  ): Promise<PriceDTO[]> {
    const { limit = 100, endTime = Date.now() } = options;

    // Calculer startDate en fonction de la résolution
    const resolutionMap = {
      '1': 60 * 1000,          // 1 minute en ms
      '5': 5 * 60 * 1000,      // 5 minutes en ms
      '15': 15 * 60 * 1000,    // 15 minutes en ms
      '1H': 60 * 60 * 1000,    // 1 heure en ms
    };

    const resolution = this.convertTimeframeToAvnuFormat(timeframe);
    const timeWindow = resolutionMap[resolution] * limit;
    const startDate = new Date(endTime - timeWindow);

    try {
      const response = await axios.get(`${this.baseUrl}/tokens/${identifier}/prices/line`, {
        params: {
          resolution,
          startDate: startDate.toISOString(),
          endDate: new Date(endTime).toISOString(),
          in: 'usd'
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from AVNU API');
      }

      return response.data.map((item: any) => ({
        timestamp: new Date(item.date).getTime(),
        price: parseFloat(item.value),
        close: parseFloat(item.value),
        open: parseFloat(item.value),
        high: parseFloat(item.value),
        low: parseFloat(item.value),
        volume: 0
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('AVNU API Error Details:', {
          status: error.response?.status,
          data: error.response?.data,
          config: error.config
        });
        throw new Error(`AVNU API Error: ${error.response?.data?.messages?.[0] || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetches current price for a token
   * @param identifier Token contract address
   * @param options Price type options (not used in AVNU implementation)
   * @returns Current price
   */
  async getCurrentPrice(
    identifier: string,
    options: { priceKind?: string } = {},
  ): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/tokens/${identifier}/prices/latest`, {
        params: {
          in: 'usd'
        }
      });

      if (!response.data || !response.data.value) {
        throw new Error('Invalid response format from AVNU API');
      }

      return parseFloat(response.data.value);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`AVNU API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Helper method to get the last n candles
   * @param identifier Token contract address
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
   * @param identifier Token contract address
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