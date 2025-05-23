import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  IAccountBalance,
  IPnLCalculation,
  AccountBalanceTokens,
} from '../interfaces/kpi.interface';
import { AccountBalanceDto, TokenBalanceDto } from '../dtos/kpi.dto';
import { ElizaAgent } from '@prisma/client';

@Injectable()
export class KPIService implements IAccountBalance {
  private readonly logger = new Logger(KPIService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AccountBalanceTokens.PnLCalculation)
    private readonly pnlCalculationService: IPnLCalculation,
  ) {}

  /**
   * Create account balance with dynamic price calculation
   * Only stores token symbols and amounts - prices are calculated dynamically
   */
  async createAccountBalanceData(
    accountBalanceDto: AccountBalanceDto,
  ): Promise<any> {
    this.logger.log(
      `Creating account balance for agent: ${accountBalanceDto.runtimeAgentId}`,
    );

    const agent = await this.findAgentByRuntimeId(
      accountBalanceDto.runtimeAgentId,
    );
    if (!agent) {
      throw new NotFoundException(
        `Agent with runtimeAgentId ${accountBalanceDto.runtimeAgentId} not found`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create the account balance record with placeholder balanceInUSD
      const accountBalance = await tx.paradexAccountBalance.create({
        data: {
          agentId: agent.id,
          balanceInUSD: 0, // Placeholder - will be calculated dynamically
        },
      });

      // Get the real-time calculated values using our enhanced service FIRST
      // We need this to store proper historical values
      const enhancedClient = this.prisma.getEnhanced();

      // Create token balance records with calculated prices and values for proper PnL tracking
      const tokenBalancePromises = accountBalanceDto.tokens.map(
        async (token: TokenBalanceDto) => {
          // Get current price for this token
          let currentPrice = 0;
          let currentValue = 0;

          if (token.symbol === 'USDC') {
            // USDC is always $1.00
            currentPrice = 1.0;
            currentValue = Number(token.balance) * 1.0;
          } else {
            // Get price from TokenMaster
            try {
              const tokenPrice = await this.prisma.tokenMaster.findFirst({
                where: { canonicalSymbol: token.symbol },
              });
              currentPrice = Number(tokenPrice?.priceUSD || 0);
              currentValue = Number(token.balance) * currentPrice;
            } catch (error) {
              this.logger.warn(
                `Could not get price for token ${token.symbol}: ${error.message}`,
              );
            }
          }

          return tx.portfolioTokenBalance.create({
            data: {
              accountBalanceId: accountBalance.id,
              tokenSymbol: token.symbol,
              amount: token.balance,
              priceUsd: currentPrice, // Store actual price at creation time
              valueUsd: currentValue, // Store actual value at creation time
            },
          });
        },
      );

      await Promise.all(tokenBalancePromises);

      // Now get the enhanced calculation to verify and update the account balance
      const calculatedBalance =
        await enhancedClient.portfolioCalculations.getAccountBalanceWithPrices(
          accountBalance.id,
        );

      // Update stored balanceInUSD with calculated value for consistency
      if (calculatedBalance) {
        await tx.paradexAccountBalance.update({
          where: { id: accountBalance.id },
          data: {
            balanceInUSD: Number(calculatedBalance.calculated_balance_usd) || 0,
          },
        });
      }

      return {
        agentId: agent.id,
        runtimeAgentId: accountBalanceDto.runtimeAgentId,
        balanceInUSD: Number(calculatedBalance?.calculated_balance_usd) || 0,
        tokens: calculatedBalance?.token_details || [],
        createdAt: accountBalance.createdAt,
        message: 'Balance created with real-time price calculations',
      };
    });
  }

  /**
   * Get agent PnL - delegated to PnLCalculationService
   */
  async getAgentPnL(
    runtimeAgentId: string,
    forceRefresh?: boolean,
  ): Promise<any> {
    return this.pnlCalculationService.getAgentPnL(runtimeAgentId, forceRefresh);
  }

  /**
   * Get all agents PnL - delegated to PnLCalculationService
   */
  async getAllAgentsPnL(forceRefresh?: boolean): Promise<any[]> {
    return this.pnlCalculationService.getAllAgentsPnL(forceRefresh);
  }

  /**
   * Get best performing agent using real-time calculations
   */
  async getBestPerformingAgent(): Promise<any> {
    const enhancedClient = this.prisma.getEnhanced();
    const allBalances =
      await enhancedClient.portfolioCalculations.getAllAccountBalancesWithCalculations();

    // Type guard to ensure allBalances is an array
    if (!Array.isArray(allBalances) || allBalances.length === 0) {
      return null;
    }

    // Find the best performing agent by calculated balance
    const bestBalance = allBalances.reduce((best: any, current: any) => {
      return Number(current.calculated_balance_usd) >
        Number(best?.calculated_balance_usd || 0)
        ? current
        : best;
    }, null);

    return bestBalance
      ? {
          agentId: bestBalance.agent_id,
          runtimeAgentId: bestBalance.runtime_agent_id,
          name: bestBalance.agent_name,
          balanceInUSD: Number(bestBalance.calculated_balance_usd),
          storedBalance: Number(bestBalance.stored_balance_usd), // Show the override
        }
      : null;
  }

  /**
   * Get agent portfolio with real-time calculated values that override stored ones
   */
  async getAgentPortfolio(runtimeAgentId: string): Promise<any> {
    const agent = await this.findAgentByRuntimeId(runtimeAgentId);
    if (!agent) {
      throw new NotFoundException(
        `Agent with runtimeAgentId ${runtimeAgentId} not found`,
      );
    }

    const enhancedClient = this.prisma.getEnhanced();
    const latestBalance =
      await enhancedClient.portfolioCalculations.getLatestAgentBalance(
        agent.id,
      );

    if (!latestBalance) {
      return {
        agentId: agent.id,
        runtimeAgentId,
        name: agent.name,
        message: 'No balance data available for this agent',
        portfolio: [],
      };
    }

    const tokenDetails = latestBalance.token_details || [];

    return {
      agentId: agent.id,
      runtimeAgentId,
      name: agent.name,
      timestamp: latestBalance.created_at,

      // Show both stored and calculated values for transparency
      storedBalanceUSD: Number(latestBalance.stored_balance_usd),
      calculatedBalanceUSD: Number(latestBalance.calculated_balance_usd),
      balanceInUSD: Number(latestBalance.calculated_balance_usd), // Use calculated as primary

      portfolio: tokenDetails.map((token: any) => ({
        symbol: token.symbol,
        amount: Number(token.amount),

        // Show override in action
        storedPrice: Number(token.stored_price_usd),
        currentPrice: Number(token.current_price_usd),
        priceOverridden:
          Number(token.stored_price_usd) !== Number(token.current_price_usd),

        storedValue: Number(token.stored_value_usd),
        calculatedValue: Number(token.calculated_value_usd),
        valueOverridden:
          Number(token.stored_value_usd) !== Number(token.calculated_value_usd),

        // Use calculated values as primary
        price: Number(token.current_price_usd),
        valueUsd: Number(token.calculated_value_usd),
        percentage:
          Number(latestBalance.calculated_balance_usd) > 0
            ? (Number(token.calculated_value_usd) /
                Number(latestBalance.calculated_balance_usd)) *
              100
            : 0,
      })),
    };
  }

  /**
   * Get agent balance history with real-time calculations
   */
  async getAgentBalanceHistory(agentId: string): Promise<any> {
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Get all balance records for this agent
    const balances = await this.prisma.paradexAccountBalance.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'asc' },
    });

    const enhancedClient = this.prisma.getEnhanced();

    // Get real-time calculations for each balance record
    const balanceHistory = await Promise.all(
      balances.map(async (balance) => {
        const calculated =
          await enhancedClient.portfolioCalculations.getAccountBalanceWithPrices(
            balance.id,
          );

        return {
          timestamp: balance.createdAt,
          storedBalance: balance.balanceInUSD,
          calculatedBalance: Number(calculated?.calculated_balance_usd) || 0,
          balanceInUSD: Number(calculated?.calculated_balance_usd) || 0, // Use calculated
          tokenCount: Number(calculated?.token_count) || 0,
          balanceOverridden:
            balance.balanceInUSD !== Number(calculated?.calculated_balance_usd),
        };
      }),
    );

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      history: balanceHistory,
    };
  }

  /**
   * Get agent current balance with real-time calculations
   */
  async getAgentCurrentBalance(agentId: string): Promise<any> {
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const enhancedClient = this.prisma.getEnhanced();
    const latestBalance =
      await enhancedClient.portfolioCalculations.getLatestAgentBalance(
        agent.id,
      );

    if (!latestBalance) {
      return {
        agentId: agent.id,
        currentBalance: 0,
        timestamp: null,
        message: 'No balance data available for this agent',
      };
    }

    return {
      agentId: agent.id,
      storedBalance: Number(latestBalance.stored_balance_usd),
      calculatedBalance: Number(latestBalance.calculated_balance_usd),
      currentBalance: Number(latestBalance.calculated_balance_usd), // Use calculated
      timestamp: latestBalance.created_at,
      balanceOverridden:
        Number(latestBalance.stored_balance_usd) !==
        Number(latestBalance.calculated_balance_usd),
    };
  }

  /**
   * Get agent by database ID
   */
  async getAgentById(agentId: string): Promise<any | null> {
    return this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
    });
  }

  private async findAgentByRuntimeId(
    runtimeAgentId: string,
  ): Promise<ElizaAgent | null> {
    // First try exact match
    let agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId,
      },
    });

    // If no exact match found, try partial matching
    if (!agent && runtimeAgentId.length >= 6) {
      this.logger.log(
        `No exact match for runtimeAgentId ${runtimeAgentId}, trying partial match...`,
      );

      // Try matching as prefix (agent sends truncated ID)
      agent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId: {
            startsWith: runtimeAgentId,
          },
        },
      });

      // If still no match, try matching as suffix or contains
      if (!agent) {
        agent = await this.prisma.elizaAgent.findFirst({
          where: {
            runtimeAgentId: {
              contains: runtimeAgentId,
            },
          },
        });
      }

      if (agent) {
        this.logger.log(
          `Found agent via partial match: ${runtimeAgentId} -> ${agent.runtimeAgentId}`,
        );
      }
    }

    return agent;
  }
}
