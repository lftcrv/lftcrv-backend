import {
  Controller,
  Get,
  Post,
  Inject,
  Param,
  Query,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AgentTokenTokens, IQueryAgentToken } from './interfaces';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Agent Token Operations')
@Controller('api/agent-token/:agentId')
@UseInterceptors(LoggingInterceptor)
export class AgentTokenController {
  constructor(
    @Inject(AgentTokenTokens.QueryAgentToken)
    private readonly tokenService: IQueryAgentToken,
    private readonly prisma: PrismaService,
  ) {}

  @Get('info')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get comprehensive token information' })
  @ApiResponse({
    status: 200,
    description: 'Token information retrieved successfully',
  })
  async getTokenInfo(@Param('agentId') agentId: string) {
    // Get token data from database
    const agentToken = await this.prisma.agentToken.findFirst({
      where: { elizaAgentId: agentId },
      include: {
        Transaction: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Get last 10 transactions
        },
        Prices: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Get last 100 price points
        },
      },
    });

    if (!agentToken) {
      throw new NotFoundException(`Token not found for agent ${agentId}`);
    }

    // Get on-chain data in parallel
    const [currentPrice, bondingPercentage, marketCap] = await Promise.all([
      this.tokenService.getCurrentPrice(agentId),
      this.tokenService.bondingCurvePercentage(agentId),
      this.tokenService.getMarketCap(agentId),
    ]);

    // Format transactions
    const transactions = agentToken.Transaction.map((tx) => ({
      hash: tx.hash,
      buyAmount: tx.buyAmount.toString(),
      sellAmount: tx.sellAmount.toString(),
      userAddress: tx.userAddress,
      timestamp: tx.createdAt.toISOString(),
    }));

    // Format price history
    const priceHistory = agentToken.Prices.map((price) => ({
      price: price.price,
      timestamp: price.timestamp.toISOString(),
    }));

    return {
      status: 'success',
      data: {
        // Basic token info
        id: agentToken.id,
        name: agentToken.token,
        symbol: agentToken.symbol,
        contractAddress: agentToken.contractAddress,
        buyTax: agentToken.buyTax,
        sellTax: agentToken.sellTax,

        // Market data
        currentPrice: currentPrice.toString(),
        marketCap: marketCap.toString(),
        bondingCurvePercentage: bondingPercentage,

        // Historical data
        recentTransactions: transactions,
        priceHistory: priceHistory,
      },
    };
  }

  @Get('current-price')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get current price of the token' })
  @ApiResponse({
    status: 200,
    description: 'Current price retrieved successfully',
  })
  async getCurrentPrice(@Param('agentId') agentId: string) {
    const price = await this.tokenService.getCurrentPrice(agentId);

    return {
      status: 'success',
      data: { price: price.toString() },
    };
  }

  @Get('bonding-curve-percentage')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get bonding curve percentage' })
  @ApiResponse({
    status: 200,
    description: 'Percentage retrieved successfully',
  })
  async getBondingCurvePercentage(@Param('agentId') agentId: string) {
    const percentage = await this.tokenService.bondingCurvePercentage(agentId);
    return {
      status: 'success',
      data: { percentage },
    };
  }

  @Get('simulate-buy')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get buy simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Buy simulation results' })
  @ApiQuery({
    name: 'tokenAmount',
    description: 'Amount of tokens to simulate',
  })
  async simulateBuy(
    @Param('agentId') agentId: string,
    @Query('tokenAmount')
    tokenAmount: string,
  ) {
    const result = await this.tokenService.simulateBuy(
      agentId,
      BigInt(tokenAmount),
    );
    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }
  @Post('push_current_price')
  @RequireApiKey()
  @ApiOperation({ summary: 'Calculate and push the price of a token' })
  @ApiResponse({ status: 200, description: 'Current price' })
  @ApiQuery({
    name: 'amountEth',
    description: 'Amount of ETH',
  })
  @ApiQuery({
    name: 'amountToken',
    description: 'Amount of tokens',
  })
  async pushCurrentPrice(
    @Param('agentId') agentId: string,
    @Param('amountEth') amountEth: number,
    @Param('amountToken') amountToken: number,
  ) {
    // First get the agent token
    const agentToken = await this.prisma.agentToken.findFirst({
      where: { elizaAgentId: agentId },
    });

    if (!agentToken) {
      throw new NotFoundException(`Token not found for agent ${agentId}`);
    }

    const price = await this.tokenService.getCurrentPrice(agentId);

    // Create price entry with correct tokenId
    await this.prisma.priceForToken.create({
      data: {
        tokenId: agentToken.id, // Use the correct AgentToken ID
        price: (amountToken / amountEth).toString(),
        timestamp: new Date(),
      },
    });

    return {
      status: 'success',
      data: {
        price: price.toString(),
        tokenId: agentToken.id,
        tokenSymbol: agentToken.symbol,
      },
    };
  }

  @Get('simulate-sell')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get sell simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Sell simulation results' })
  @ApiQuery({
    name: 'tokenAmount',
    description: 'Amount of tokens to simulate',
  })
  async simulateSell(
    @Param('agentId') agentId: string,
    @Query('tokenAmount')
    tokenAmount: string,
  ) {
    const result = await this.tokenService.simulateSell(
      agentId,
      BigInt(tokenAmount),
    );
    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }

  @Get('market-cap')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get market cap of the token' })
  @ApiResponse({
    status: 200,
    description: 'Market cap retrieved successfully',
  })
  async getMarketCap(@Param('agentId') agentId: string) {
    const marketCap = await this.tokenService.getMarketCap(agentId);
    return {
      status: 'success',
      data: { marketCap: marketCap.toString() },
    };
  }

  @Get('price-history')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get price history for the token (limited to last 5000 prices)',
  })
  @ApiResponse({
    status: 200,
    description: 'Price history retrieved successfully',
  })
  async getPriceHistory(@Param('agentId') agentId: string) {
    // First get the agent token
    const agentToken = await this.prisma.agentToken.findFirst({
      where: { elizaAgentId: agentId },
    });

    if (!agentToken) {
      throw new NotFoundException(`Token not found for agent ${agentId}`);
    }

    // Get price history with limit
    const priceHistory = await this.prisma.priceForToken.findMany({
      where: { tokenId: agentToken.id },
      orderBy: { timestamp: 'desc' },
      take: 5000, // Prisma limit
      select: {
        id: true,
        price: true,
        timestamp: true,
      },
    });

    // Format the response and ensure we only take 5000 prices
    const formattedPrices = priceHistory.slice(0, 5000).map((entry) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      price: entry.price,
    }));

    return {
      status: 'success',
      data: {
        prices: formattedPrices,
        tokenSymbol: agentToken.symbol,
        tokenAddress: agentToken.contractAddress,
      },
    };
  }
}
