import { Injectable, NotFoundException } from '@nestjs/common';
import { IElizaAgentQueryService } from '../interfaces';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ElizaAgent, AgentStatus } from '../entities/leftcurve-agent.entity';

@Injectable()
export class ElizaAgentQueryService implements IElizaAgentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private transformToEntity(agent: any): ElizaAgent {
    const elizaAgent = new ElizaAgent({});
    Object.assign(elizaAgent, agent);
    return elizaAgent;
  }

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

    return this.transformToEntity(agent);
  }

  async listAgents(): Promise<ElizaAgent[]> {
    const agents = await this.prisma.elizaAgent.findMany({
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });

    return agents.map((agent) => this.transformToEntity(agent));
  }

  async listRunningAgents(): Promise<ElizaAgent[]> {
    const agents = await this.prisma.elizaAgent.findMany({
      where: { status: AgentStatus.RUNNING },
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });

    return agents.map((agent) => this.transformToEntity(agent));
  }

  async listLatestAgents(): Promise<ElizaAgent[]> {
    const agents = await this.prisma.elizaAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        LatestMarketData: true,
        Token: true,
        Wallet: true,
      },
    });

    return agents.map((agent) => this.transformToEntity(agent));
  }

  async searchAgents(searchTerm: string): Promise<ElizaAgent[]> {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const agents = await this.prisma.elizaAgent.findMany({
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

    return agents.map((agent) => this.transformToEntity(agent));
  }
}
