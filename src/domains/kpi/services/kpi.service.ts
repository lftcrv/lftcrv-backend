import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { AccountBalanceDto, TokenBalanceDto } from '../dtos/kpi.dto';
import { ElizaAgent } from '@prisma/client';
import { IPriceService } from '../../analysis/technical/interfaces/price.interface';
import { ConfigService } from '@nestjs/config';
import { AVNU_TOKENS } from '../../analysis/technical/config/tokens.config';
import { AnalysisToken } from '../../analysis/technical/interfaces';

// Type extension for PrismaService to handle models not in schema
interface ExtendedPrismaModels {
  paradexAccountBalance: {
    create: any;
    findMany: any;
  };
  portfolioTokenBalance: {
    create: any;
    findMany: any;
  };
  agentPerformanceSnapshot?: {
    create: any;
    findMany: any;
  };
}

// Extended PrismaService with additional models
type ExtendedPrismaService = PrismaService & ExtendedPrismaModels;

// List of standard tokens to validate pricing for
const STANDARD_TOKENS = ['ETH', 'BTC', 'USDC', 'DAI', 'USDT', 'WBTC', 'WETH', 'STRK'];

@Injectable()
export class KPIService implements IAccountBalance {
  private readonly logger = new Logger(KPIService.name);
  private readonly tokenAddressMap: Map<string, string> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AnalysisToken.AvnuPriceService)
    private readonly avnuPriceService: IPriceService,
    @Inject(AnalysisToken.ParadexPriceService)
    private readonly paradexPriceService: IPriceService,
  ) {
    // Build token address map for AVNU tokens
    AVNU_TOKENS.forEach((token) => {
      this.tokenAddressMap.set(token.name.toUpperCase(), token.address);
    });
  }

  async createAccountBalanceData(data: AccountBalanceDto): Promise<any> {
    this.logger.log('Creating balance account data:', {
      runtimeAgentId: data.runtimeAgentId,
      balanceInUSD: data.balanceInUSD,
      hasTokens: data.tokens ? data.tokens.length : 0,
    });

    const agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: {
          startsWith: data.runtimeAgentId,
        },
      },
    });

    if (!agent) {
      const exactAgent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId: data.runtimeAgentId,
        },
      });

      if (!exactAgent) {
        throw new NotFoundException(
          `Agent with runtimeAgentId starting with ${data.runtimeAgentId} not found`,
        );
      }

      return this.createBalanceRecordForAgent(exactAgent, data);
    }

    return this.createBalanceRecordForAgent(agent, data);
  }

  private async createBalanceRecordForAgent(
    agent: any,
    data: AccountBalanceDto,
  ): Promise<any> {
    const extendedPrisma = this.prisma as ExtendedPrismaService;

    try {
      // Create the balance record
      const balanceRecord = await extendedPrisma.paradexAccountBalance.create({
        data: {
          createdAt: new Date(),
          balanceInUSD: data.balanceInUSD,
          agentId: agent.id,
        },
      });

      this.logger.log(`Created balance record with ID: ${balanceRecord.id}`);

      // If token details are provided, store them
      if (data.tokens && data.tokens.length > 0) {
        this.logger.log(`Processing ${data.tokens.length} token balances`);

        // Validate and update token prices if necessary
        const updatedTokens = await this.validateAndUpdateTokenPrices(data.tokens);

        const tokenPromises = updatedTokens.map((token) =>
          this.createTokenBalanceRecord(balanceRecord.id, token),
        );

        await Promise.all(tokenPromises);
        this.logger.log('All token balances saved successfully');
      }

      return {
        id: balanceRecord.id,
        agentId: agent.id,
        runtimeAgentId: agent.runtimeAgentId,
        balanceInUSD: data.balanceInUSD,
        tokenCount: data.tokens?.length || 0,
        createdAt: balanceRecord.createdAt,
      };
    } catch (error) {
      this.logger.error('Error creating balance record:', error);
      throw error;
    }
  }

  /**
   * Validates and updates token prices for standard tokens
   * @param tokens Token balance data
   * @returns Updated token balance data with accurate prices
   */
  private async validateAndUpdateTokenPrices(
    tokens: TokenBalanceDto[],
  ): Promise<TokenBalanceDto[]> {
    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        // Only validate prices for known standard tokens
        if (STANDARD_TOKENS.includes(token.symbol.toUpperCase())) {
          try {
            // Try to get the current market price
            const currentPrice = await this.getTokenCurrentPrice(token.symbol);
            
            // If we successfully got a price and it's significantly different (more than 5%)
            if (currentPrice && Math.abs(currentPrice - token.price) / token.price > 0.05) {
              this.logger.log(
                `Updating price for ${token.symbol} from ${token.price} to ${currentPrice} (difference: ${(Math.abs(currentPrice - token.price) / token.price * 100).toFixed(2)}%)`,
              );
              
              // Return updated token with corrected price
              return {
                ...token,
                price: currentPrice,
              };
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get current price for ${token.symbol}, using provided price: ${error.message}`,
            );
          }
        }
        // Return original token if not a standard token or price validation failed
        return token;
      }),
    );

    // Recalculate the total portfolio value with updated prices
    const totalValue = updatedTokens.reduce(
      (sum, token) => sum + token.balance * token.price, 
      0
    );
    
    this.logger.log(`Total portfolio value after price validation: ${totalValue}`);
    
    return updatedTokens;
  }

  /**
   * Gets the current market price for a token
   * @param tokenSymbol The token symbol (e.g., "ETH")
   * @returns Current price or null if not available
   */
  private async getTokenCurrentPrice(tokenSymbol: string): Promise<number | null> {
    const symbol = tokenSymbol.toUpperCase();
    
    try {
      // First try AVNU price service for Starknet tokens
      try {
        // Get token address from our map instead of calling getter
        const tokenAddress = this.tokenAddressMap.get(symbol);
        if (!tokenAddress) {
          throw new Error(`Token ${symbol} not found in AVNU tokens list`);
        }
        
        const price = await this.avnuPriceService.getCurrentPrice(tokenAddress);
        this.logger.log(`Got price for ${symbol} from AVNU: ${price}`);
        return price;
      } catch (avnuError) {
        // If AVNU fails, try Paradex
        const price = await this.paradexPriceService.getCurrentPrice(symbol);
        this.logger.log(`Got price for ${symbol} from Paradex: ${price}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Could not get current price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  private async createTokenBalanceRecord(
    accountBalanceId: string,
    token: TokenBalanceDto,
  ): Promise<any> {
    try {
      const extendedPrisma = this.prisma as ExtendedPrismaService;

      const valueUsd = token.balance * token.price;

      const tokenRecord = await extendedPrisma.portfolioTokenBalance.create({
        data: {
          accountBalanceId,
          tokenSymbol: token.symbol,
          amount: token.balance,
          priceUsd: token.price,
          valueUsd: valueUsd,
          createdAt: new Date(),
        },
      });

      this.logger.log(
        `Created token balance record for ${token.symbol}: ${token.balance} @ $${token.price}`,
      );
      return tokenRecord;
    } catch (error) {
      this.logger.error(
        `Error creating token balance for symbol ${token.symbol}:`,
        error,
      );
      throw error;
    }
  }

  async getAgentPnL(runtimeAgentId: string): Promise<any> {
    this.logger.log(
      `Calculating PnL for agent with runtimeAgentId: ${runtimeAgentId}`,
    );

    // First try to find by runtimeAgentId
    let agent = await this.findAgentByRuntimeId(runtimeAgentId);

    // If not found, try to find by regular id
    if (!agent) {
      agent = await this.prisma.elizaAgent.findUnique({
        where: { id: runtimeAgentId },
      });
    }

    if (!agent) {
      throw new NotFoundException(
        `Agent with runtimeAgentId or id ${runtimeAgentId} not found`,
      );
    }

    return this.calculatePnLForAgent(agent);
  }

  async getAllAgentsPnL(): Promise<any[]> {
    this.logger.log('Calculating PnL for all agents');
    const agents = await this.prisma.elizaAgent.findMany();
    const results = await Promise.all(
      agents.map((agent) => this.calculatePnLForAgent(agent)),
    );

    return results.sort((a, b) => b.pnl - a.pnl);
  }

  async getBestPerformingAgent(): Promise<any> {
    this.logger.log('Finding the best performing agent by PnL');

    const allAgentsPnL = await this.getAllAgentsPnL();

    if (allAgentsPnL.length === 0) {
      return {
        message: 'No agents with PnL data available',
        bestAgent: null,
      };
    }
    const bestAgent = allAgentsPnL[0];

    if (!bestAgent.firstBalance || bestAgent.pnl === 0) {
      return {
        message: 'Found a best agent, but no significant PnL data available',
        bestAgent,
      };
    }

    return {
      message: 'Best performing agent found',
      bestAgent,
    };
  }

  async getAgentPortfolio(runtimeAgentId: string): Promise<any> {
    this.logger.log(`Getting portfolio for agent: ${runtimeAgentId}`);

    const agent = await this.findAgentByRuntimeId(runtimeAgentId);
    if (!agent) {
      throw new NotFoundException(
        `Agent with runtimeAgentId ${runtimeAgentId} not found`,
      );
    }

    // Get latest balance record
    const latestBalance = await this.prisma.paradexAccountBalance.findFirst({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestBalance) {
      return {
        agentId: agent.id,
        runtimeAgentId: agent.runtimeAgentId,
        name: agent.name,
        message: 'No balance data available for this agent',
        portfolio: [],
      };
    }

    // Get token balances for this balance record
    const extendedPrisma = this.prisma as ExtendedPrismaService;
    const tokenBalances = await extendedPrisma.portfolioTokenBalance.findMany({
      where: { accountBalanceId: latestBalance.id },
      orderBy: { valueUsd: 'desc' },
    });

    // Recalculate the total balance based on the sum of token values
    // This ensures consistency between total and parts
    const totalValueUsd = tokenBalances.reduce(
      (sum, token) => sum + Number(token.valueUsd),
      0,
    );

    // Use the calculated total instead of the stored balance if they don't match
    const actualBalanceInUSD =
      Math.abs(totalValueUsd - latestBalance.balanceInUSD) < 0.01
        ? latestBalance.balanceInUSD
        : totalValueUsd;

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      timestamp: latestBalance.createdAt,
      balanceInUSD: actualBalanceInUSD,
      portfolio: tokenBalances.map((token) => ({
        symbol: token.tokenSymbol,
        balance: Number(token.amount),
        price: Number(token.priceUsd),
        valueUsd: Number(token.valueUsd),
        percentage: (Number(token.valueUsd) / actualBalanceInUSD) * 100,
      })),
    };
  }

  private async calculatePnLForAgent(agent: any): Promise<any> {
    const extendedPrisma = this.prisma as ExtendedPrismaService;
    const balances = await extendedPrisma.paradexAccountBalance.findMany({
      where: {
        agentId: agent.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (balances.length === 0) {
      return {
        agentId: agent.id,
        runtimeAgentId: agent.runtimeAgentId,
        name: agent.name,
        pnl: 0,
        pnlPercentage: 0,
        firstBalance: null,
        latestBalance: null,
        message: 'No balance data available for this agent',
      };
    }

    // Filter out any zero balance records - these shouldn't be used for PnL calculations
    const nonZeroBalances = balances.filter(
      (balance) => balance.balanceInUSD !== 0 && balance.balanceInUSD !== null,
    );

    if (nonZeroBalances.length === 0) {
      return {
        agentId: agent.id,
        runtimeAgentId: agent.runtimeAgentId,
        name: agent.name,
        pnl: 0,
        pnlPercentage: 0,
        firstBalance: null,
        latestBalance: null,
        message: 'No non-zero balance data available for this agent',
      };
    }

    const firstBalanceRecord = nonZeroBalances[0];
    const latestBalanceRecord = nonZeroBalances[nonZeroBalances.length - 1];

    // Get token balances for the first and latest balance records
    const firstTokenBalances =
      await extendedPrisma.portfolioTokenBalance.findMany({
        where: { accountBalanceId: firstBalanceRecord.id },
      });

    const latestTokenBalances =
      await extendedPrisma.portfolioTokenBalance.findMany({
        where: { accountBalanceId: latestBalanceRecord.id },
      });

    // Calculate actual balance values
    const firstTotalValueUsd = firstTokenBalances.reduce(
      (sum, token) => sum + Number(token.valueUsd),
      0,
    );

    const latestTotalValueUsd = latestTokenBalances.reduce(
      (sum, token) => sum + Number(token.valueUsd),
      0,
    );

    // Use calculated values or stored values if very close
    const actualFirstBalance =
      Math.abs(firstTotalValueUsd - firstBalanceRecord.balanceInUSD) < 0.01
        ? firstBalanceRecord.balanceInUSD
        : firstTotalValueUsd || 0;

    const actualLatestBalance =
      Math.abs(latestTotalValueUsd - latestBalanceRecord.balanceInUSD) < 0.01
        ? latestBalanceRecord.balanceInUSD
        : latestTotalValueUsd || 0;

    const pnl = actualLatestBalance - actualFirstBalance;

    const pnlPercentage =
      actualFirstBalance !== 0 ? (pnl / actualFirstBalance) * 100 : 0;

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      pnl,
      pnlPercentage,
      firstBalanceDate: firstBalanceRecord.createdAt,
      latestBalanceDate: latestBalanceRecord.createdAt,
      firstBalance: actualFirstBalance,
      latestBalance: actualLatestBalance,
    };
  }

  private async findAgentByRuntimeId(runtimeAgentId: string): Promise<any> {
    return this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId,
      },
    });
  }

  async getAgentBalanceHistory(agentId: string): Promise<any> {
    this.logger.log(`Getting balance history for agent with ID: ${agentId}`);
    // Verify the agent exists first
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const extendedPrisma = this.prisma as ExtendedPrismaService;
    const balances = await extendedPrisma.paradexAccountBalance.findMany({
      where: {
        agentId: agent.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get corrected balance values for each record
    const balancesWithCorrectValues = await Promise.all(
      balances.map(async (balance) => {
        const tokenBalances =
          await extendedPrisma.portfolioTokenBalance.findMany({
            where: { accountBalanceId: balance.id },
          });

        const totalValueUsd = tokenBalances.reduce(
          (sum, token) => sum + Number(token.valueUsd),
          0,
        );

        // Mark zero-balance records to avoid using them in PnL calculations
        const isZeroBalance = totalValueUsd === 0 || balance.balanceInUSD === 0;

        const correctedBalance = {
          ...balance,
          originalBalanceInUSD: balance.balanceInUSD, // Keep original for reference
          balanceInUSD:
            Math.abs(totalValueUsd - balance.balanceInUSD) < 0.01
              ? balance.balanceInUSD
              : totalValueUsd,
          isZeroBalance, // Add flag for UI to handle
          tokenBalances: tokenBalances.map((token) => ({
            symbol: token.tokenSymbol,
            balance: Number(token.amount),
            price: Number(token.priceUsd),
            valueUsd: Number(token.valueUsd),
          })),
        };

        return correctedBalance;
      }),
    );

    // Also calculate a PnL series with non-zero balances only
    const nonZeroBalances = balancesWithCorrectValues.filter(
      (b) => !b.isZeroBalance,
    );

    // Calculate PnL for each point compared to the first non-zero balance
    let pnlSeries = [];
    if (nonZeroBalances.length > 0) {
      const firstBalance = nonZeroBalances[0].balanceInUSD;
      pnlSeries = nonZeroBalances.map((balance) => ({
        timestamp: balance.createdAt,
        balance: balance.balanceInUSD,
        pnl: balance.balanceInUSD - firstBalance,
        pnlPercentage:
          firstBalance !== 0
            ? ((balance.balanceInUSD - firstBalance) / firstBalance) * 100
            : 0,
      }));
    }

    return {
      agentId: agent.id,
      balances: balancesWithCorrectValues,
      pnlSeries,
      validBalanceCount: nonZeroBalances.length,
    };
  }

  async getAgentCurrentBalance(agentId: string): Promise<any> {
    this.logger.log(`Getting current balance for agent with ID: ${agentId}`);
    // Verify the agent exists first
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const extendedPrisma = this.prisma as ExtendedPrismaService;
    const latestBalance = await extendedPrisma.paradexAccountBalance.findMany({
      where: {
        agentId: agent.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (latestBalance.length === 0) {
      return {
        agentId: agent.id,
        currentBalance: 0,
        timestamp: null,
        message: 'No balance data available for this agent',
      };
    }

    // Get token balances to calculate the actual balance value (same as in getAgentPortfolio)
    const tokenBalances = await extendedPrisma.portfolioTokenBalance.findMany({
      where: { accountBalanceId: latestBalance[0].id },
    });

    // Recalculate the total balance based on the sum of token values
    const totalValueUsd = tokenBalances.reduce(
      (sum, token) => sum + Number(token.valueUsd),
      0,
    );

    // Use the calculated total instead of the stored balance if they don't match
    const actualBalanceInUSD =
      Math.abs(totalValueUsd - latestBalance[0].balanceInUSD) < 0.01
        ? latestBalance[0].balanceInUSD
        : totalValueUsd;

    return {
      agentId: agent.id,
      currentBalance: actualBalanceInUSD,
      timestamp: latestBalance[0].createdAt,
    };
  }

  async getAgentById(agentId: string): Promise<ElizaAgent | null> {
    this.logger.log(`Getting agent with ID: ${agentId}`);
    try {
      const agent = await this.prisma.elizaAgent.findUnique({
        where: { id: agentId },
      });

      return agent;
    } catch (error) {
      this.logger.error(
        `Error getting agent with ID ${agentId}: ${error.message}`,
      );
      return null;
    }
  }
}
