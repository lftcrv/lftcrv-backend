import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from '../price.service';
import axios from 'axios';
import { TimeFrame } from '../../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PriceService', () => {
  let service: PriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceService],
    }).compile();

    service = module.get<PriceService>(PriceService);
    jest.clearAllMocks();
  });

  describe('getCurrentPrice', () => {
    const mockPriceResponse = {
      data: {
        results: [
          {
            mark_price: '50000.5',
            underlying_price: '50100.75',
            last_traded_price: '50200.25',
          },
        ],
      },
    };

    it('should fetch current price with default type (mark)', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockPriceResponse);

      const price = await service.getCurrentPrice('BTC');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/markets/summary'),
        expect.any(Object),
      );
      expect(price).toBe(50000.5);
    });

    it('should handle different price kinds correctly', async () => {
      mockedAxios.get.mockResolvedValue(mockPriceResponse);

      const tests = [
        { kind: 'mark' as const, expected: 50000.5 },
        { kind: 'index' as const, expected: 50100.75 },
        { kind: 'last' as const, expected: 50200.25 },
      ];

      for (const { kind, expected } of tests) {
        const price = await service.getCurrentPrice('BTC', { priceKind: kind });
        expect(price).toBe(expected);
      }
    });

    it('should throw error on API failure', async () => {
      const errorMessage = 'API Error';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(service.getCurrentPrice('BTC')).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('getHistoricalPrices', () => {
    const mockKlineData = [
      [1625097600000, '35000.5', '35100.75', '34900.25', '35050.5', '100.5'],
      [1625097900000, '35050.5', '35150.75', '34950.25', '35100.5', '120.5'],
    ];

    const mockKlineResponse = {
      data: {
        results: mockKlineData,
      },
    };

    it('should handle supported timeframes correctly', async () => {
      const supportedTimeframes: TimeFrame[] = [
        '1m',
        '3m',
        '5m',
        '15m',
        '30m',
        '1h',
      ];

      for (const timeframe of supportedTimeframes) {
        mockedAxios.get.mockResolvedValueOnce(mockKlineResponse);

        const prices = await service.getHistoricalPrices('BTC', timeframe, {
          limit: 2,
        });

        expect(prices).toHaveLength(2);
        expect(prices[0]).toMatchObject({
          timestamp: expect.any(Number),
          open: expect.any(Number),
          high: expect.any(Number),
          low: expect.any(Number),
          close: expect.any(Number),
          volume: expect.any(Number),
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/markets/klines'),
          expect.objectContaining({
            params: expect.objectContaining({
              resolution: service['timeframeToMinutes'][timeframe].toString(),
            }),
          }),
        );
      }
    });

    it('should handle API errors correctly', async () => {
      const errorMessage = 'API Error';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        service.getHistoricalPrices('BTC', '1m', { limit: 10 }),
      ).rejects.toThrow(errorMessage);
    });

    it('should respect the limit parameter', async () => {
      // Create mock data with more entries than the limit
      const extendedMockData = Array(5).fill(mockKlineData[0]);
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: extendedMockData },
      });

      const limit = 3;
      const prices = await service.getHistoricalPrices('BTC', '1m', { limit });

      expect(prices).toHaveLength(limit);
    });
  });

  describe('Helper methods', () => {
    const mockCandle = [
      1625097600000,
      '35000.5',
      '35100.75',
      '34900.25',
      '35050.5',
      '100.5',
    ];
    const mockResponse = {
      data: {
        results: [mockCandle],
      },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue(mockResponse);
    });

    describe('getLastCandles', () => {
      it('should pass correct parameters', async () => {
        const number = 5;
        const timeframe: TimeFrame = '15m';

        await service.getLastCandles('BTC', number, timeframe);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/markets/klines'),
          expect.objectContaining({
            params: expect.objectContaining({
              symbol: 'BTC-USD-PERP',
              resolution: '15',
            }),
          }),
        );
      });
    });

    describe('getPricesInPeriod', () => {
      it('should pass correct time parameters', async () => {
        const startTime = 1625097600000;
        const endTime = 1625184000000;

        await service.getPricesInPeriod('BTC', '1h', startTime, endTime);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/markets/klines'),
          expect.objectContaining({
            params: expect.objectContaining({
              start_at: startTime,
              end_at: endTime,
            }),
          }),
        );
      });
    });

    describe('getPricesFromDate', () => {
      it('should pass correct start time', async () => {
        const startTime = 1625097600000;

        await service.getPricesFromDate('BTC', '1h', startTime);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/markets/klines'),
          expect.objectContaining({
            params: expect.objectContaining({
              start_at: startTime,
            }),
          }),
        );
      });
    });
  });
});
