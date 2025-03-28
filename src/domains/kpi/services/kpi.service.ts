import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { AccountBalanceDto } from '../dtos/kpi.dto';

@Injectable()
export class KPIService implements IAccountBalance {
  private readonly logger = new Logger();

  constructor(private readonly prisma: PrismaService) {}

  async createAccountBalanceData(
    data: AccountBalanceDto,
  ): Promise<any> {
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

      return this.prisma.paradexAccountBalance.create({
        data: {
          createdAt: new Date(),
          balanceInUSD: data.balanceInUSD,
          agentId: exactAgent.id,
        },
      });
    }

    return this.prisma.paradexAccountBalance.create({
      data: {
        createdAt: new Date(),
        balanceInUSD: data.balanceInUSD,
        agentId: agent.id,
      },
    });
  }

  async getAgentPnL(runtimeAgentId: string): Promise<any> {
    this.logger.log(`Calculating PnL for agent with runtimeAgentId: ${runtimeAgentId}`);
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
      agents.map(agent => this.calculatePnLForAgent(agent))
    );
    
    return results.sort((a, b) => b.pnl - a.pnl);
  }
  
  async getBestPerformingAgent(): Promise<any> {
    this.logger.log('Finding the best performing agent by PnL');
    
    const allAgentsPnL = await this.getAllAgentsPnL();
    
    if (allAgentsPnL.length === 0) {
      return {
        message: 'No agents with PnL data available',
        bestAgent: null
      };
    }
    const bestAgent = allAgentsPnL[0];
    
    if (!bestAgent.firstBalance || bestAgent.pnl === 0) {
      return {
        message: 'Found a best agent, but no significant PnL data available',
        bestAgent
      };
    }
    
    return {
      message: 'Best performing agent found',
      bestAgent
    };
  }
  
  private async calculatePnLForAgent(agent: any): Promise<any> {
    const balances = await this.prisma.paradexAccountBalance.findMany({
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
    
    const pnlPercentage = firstBalance.balanceInUSD !== 0 
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

  private async findAgentByRuntimeId(runtimeAgentId: string) {
    let agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: {
          startsWith: runtimeAgentId,
        },
      },
    });

    if (!agent) {
      agent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId: runtimeAgentId,
        },
      });
    }

    return agent;
  }
}