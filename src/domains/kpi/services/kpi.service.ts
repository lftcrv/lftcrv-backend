import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { AccountBalanceDto, TokenBalanceDto } from '../dtos/kpi.dto';

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
    const agent = await this.findAgentByRuntimeId(runtimeAgentId);

    if (!agent) {
      throw new NotFoundException(
        `Agent with runtimeAgentId ${runtimeAgentId} not found`,
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
    const tokenBalances = await this.prisma.portfolioTokenBalance.findMany({
      where: { accountBalanceId: latestBalance.id },
      orderBy: { valueUsd: 'desc' },
    });

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      timestamp: latestBalance.createdAt,
      balanceInUSD: latestBalance.balanceInUSD,
      portfolio: tokenBalances.map((token) => ({
        symbol: token.tokenSymbol,
        balance: Number(token.amount),
        price: Number(token.priceUsd),
        valueUsd: Number(token.valueUsd),
        percentage: (Number(token.valueUsd) / latestBalance.balanceInUSD) * 100,
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

    const firstBalance = balances[0];
    const latestBalance = balances[balances.length - 1];

    const pnl = latestBalance.balanceInUSD - firstBalance.balanceInUSD;

    const pnlPercentage =
      firstBalance.balanceInUSD !== 0
        ? (pnl / firstBalance.balanceInUSD) * 100
        : 0;

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      pnl,
      pnlPercentage,
      firstBalanceDate: firstBalance.createdAt,
      latestBalanceDate: latestBalance.createdAt,
      firstBalance: firstBalance.balanceInUSD,
      latestBalance: latestBalance.balanceInUSD,
    };
  }

  private async findAgentByRuntimeId(runtimeAgentId: string): Promise<any> {
    return this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId,
      },
    });
  }
}
