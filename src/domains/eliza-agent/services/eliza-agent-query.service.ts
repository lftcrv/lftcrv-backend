import { Injectable, NotFoundException } from '@nestjs/common';
import { IElizaAgentQueryService } from '../interfaces';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ElizaAgent, AgentStatus } from '../entities/eliza-agent.entity';

@Injectable()
export class ElizaAgentQueryService implements IElizaAgentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgent(id: string): Promise<ElizaAgent> {
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id },
      include: {
        LatestMarketData: true,
        TradingInformation: true,
        Token: true,
        Wallet: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    // Transform Prisma model to our entity
    const elizaAgent = new ElizaAgent();
    Object.assign(elizaAgent, agent);

    return elizaAgent;
  }

  async listAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });
  }

  async listRunningAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      where: { status: AgentStatus.RUNNING },
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });
  }

  async listLatestAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });
  }

  async searchAgents(searchTerm: string): Promise<ElizaAgent[]> {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return this.prisma.elizaAgent.findMany({
      where: {
        OR: [
          {
            name: {
              contains: normalizedSearchTerm,
              mode: 'insensitive',
            },
          },
          {
            runtimeAgentId: {
              contains: normalizedSearchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
