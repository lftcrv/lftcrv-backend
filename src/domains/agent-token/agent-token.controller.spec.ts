import { Test, TestingModule } from '@nestjs/testing';
import { AgentTokenController } from './agent-token.controller';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AgentTokenTokens } from './interfaces';
import { NotFoundException } from '@nestjs/common';

// Mock the LoggingInterceptor
jest.mock('../../shared/interceptors/logging.interceptor', () => ({
  LoggingInterceptor: jest.fn().mockImplementation(() => ({
    intercept: jest.fn().mockImplementation((context, next) => next.handle()),
  })),
}));

// Mock the RequireApiKey decorator
jest.mock('../../shared/auth/decorators/require-api-key.decorator', () => ({
  RequireApiKey: () => jest.fn(),
}));

describe('AgentTokenController', () => {
  let controller: AgentTokenController;
  let prismaService: PrismaService;

  const mockQueryAgentToken = {
    getCurrentPrice: jest.fn(),
    simulateBuy: jest.fn(),
    simulateSell: jest.fn(),
    bondingCurvePercentage: jest.fn(),
    getMarketCap: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentTokenController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            agentToken: {
              findFirst: jest.fn(),
            },
            priceForToken: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: AgentTokenTokens.QueryAgentToken,
          useValue: mockQueryAgentToken,
        },
      ],
    }).compile();

    controller = module.get<AgentTokenController>(AgentTokenController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getPriceHistory', () => {
    const mockAgentId = 'test-agent-id';
    const mockAgentToken = {
      id: 'token-id',
      symbol: 'TEST',
      token: 'TEST_TOKEN',
      contractAddress: '0x123',
      buyTax: 5,
      sellTax: 5,
      elizaAgentId: mockAgentId,
    };

    it('should throw NotFoundException when agent token not found', async () => {
      jest.spyOn(prismaService.agentToken, 'findFirst').mockResolvedValue(null);

      await expect(controller.getPriceHistory(mockAgentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return at most 5000 prices even when more exist', async () => {
      // Mock finding the agent token
      jest
        .spyOn(prismaService.agentToken, 'findFirst')
        .mockResolvedValue(mockAgentToken);

      // Create more than 5000 mock prices
      const totalPrices = 6000;
      const mockPrices = Array.from({ length: totalPrices }, (_, i) => ({
        id: `price-${i}`,
        price: (1000 + i).toString(),
        timestamp: new Date(2024, 0, 1, 0, i), // Different time for each price
        tokenId: mockAgentToken.id,
      }));

      // Mock the findMany call to return all prices (no slice here)
      jest
        .spyOn(prismaService.priceForToken, 'findMany')
        .mockResolvedValue(mockPrices);

      const result = await controller.getPriceHistory(mockAgentId);

      // Verify the query included the take limit
      expect(prismaService.priceForToken.findMany).toHaveBeenCalledWith({
        where: { tokenId: mockAgentToken.id },
        orderBy: { timestamp: 'desc' },
        take: 5000,
        select: {
          id: true,
          price: true,
          timestamp: true,
        },
      });

      // Verify we got exactly 5000 prices
      expect(result.data.prices.length).toBe(5000);

      // Additional verification that we're getting the first 5000 prices
      expect(result.data.prices.length).toBeLessThan(mockPrices.length);
      expect(
        result.data.prices.every(
          (price, index) => price.id === mockPrices[index].id,
        ),
      ).toBe(true);

      // Verify the response structure
      expect(result).toEqual({
        status: 'success',
        data: {
          prices: expect.any(Array),
          tokenSymbol: mockAgentToken.symbol,
          tokenAddress: mockAgentToken.contractAddress,
        },
      });
    });
  });
});
