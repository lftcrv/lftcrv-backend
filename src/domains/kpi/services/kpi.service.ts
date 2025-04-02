import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { AccountBalanceDto } from '../dtos/kpi.dto';

// Type extension for PrismaService to handle models not in schema
interface ExtendedPrismaModels {
  paradexAccountBalance: {
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
  private readonly logger = new Logger();

  constructor(private readonly prisma: PrismaService) {}

  async createAccountBalanceData(data: AccountBalanceDto): Promise<any> {
    this.logger.log('Creating trading information:', data);

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

      const extendedPrisma = this.prisma as ExtendedPrismaService;
      return extendedPrisma.paradexAccountBalance.create({
        data: {
          createdAt: new Date(),
          balanceInUSD: data.balanceInUSD,
          agentId: exactAgent.id,
        },
      });
    }

    const extendedPrisma = this.prisma as ExtendedPrismaService;
    return extendedPrisma.paradexAccountBalance.create({
      data: {
        createdAt: new Date(),
        balanceInUSD: data.balanceInUSD,
        agentId: agent.id,
      },
    });
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

    return {
      agentId: agent.id,
      balances,
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

    return {
      agentId: agent.id,
      currentBalance: latestBalance[0].balanceInUSD,
      timestamp: latestBalance[0].createdAt,
    };
  }
}
