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
      },
    });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async listAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      include: {
        LatestMarketData: true,
      },
    });
  }

  async listRunningAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      where: { status: AgentStatus.RUNNING },
      include: {
        LatestMarketData: true,
      },
    });
  }

  async listLatestAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        LatestMarketData: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
