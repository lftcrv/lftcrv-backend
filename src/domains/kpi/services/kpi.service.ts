import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { AccountBalanceDto, TokenBalanceDto } from '../dtos/kpi.dto';
import { ElizaAgent } from '@prisma/client';

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

@Injectable()
export class KPIService implements IAccountBalance {
  private readonly logger = new Logger(KPIService.name);

  constructor(private readonly prisma: PrismaService) {}

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

        const tokenPromises = data.tokens.map((token) =>
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
