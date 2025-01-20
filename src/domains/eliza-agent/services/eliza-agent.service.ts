import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IElizaAgentService } from '../interfaces/eliza-agent-service.interface';
import { IDockerService } from '../interfaces/docker-service.interface';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  AgentStatus,
  ElizaAgent,
  LatestMarketData,
} from '../entities/eliza-agent.entity';
import { CreateElizaAgentDto } from '../dtos/eliza-agent.dto';
import { ServiceTokens } from '../interfaces';

@Injectable()
export class ElizaAgentService implements IElizaAgentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
  ) {}

  async createAgent(dto: CreateElizaAgentDto): Promise<ElizaAgent> {
    const { containerId, port } = await this.dockerService.createContainer({
      name: dto.name,
      characterConfig: dto.characterConfig,
    });

    // Create the agent with the new default fields
    const agent = await this.prisma.elizaAgent.create({
      data: {
        name: dto.name,
        curveSide: dto.curveSide,
        status: AgentStatus.STARTING,
        containerId,
        port,
        characterConfig: dto.characterConfig,
        degenScore: 0,
        winScore: 0,
        LatestMarketData: {
          create: {
            price: 0,
            priceChange24h: 0,
            holders: 0,
            marketCap: 0,
          },
        },
      },
      include: {
        LatestMarketData: true,
      },
    });

    await this.dockerService.startContainer(containerId);

    const runtimeAgentId =
      await this.dockerService.getRuntimeAgentId(containerId);

    if (runtimeAgentId) {
      const updatedAgent = await this.prisma.elizaAgent.update({
        where: { id: agent.id },
        data: {
          runtimeAgentId,
          status: AgentStatus.RUNNING,
        },
        include: {
          LatestMarketData: true,
        },
      });
      return updatedAgent;
    }

    console.warn(`Could not retrieve runtime ID for agent ${agent.id}`);
    return agent;
  }

  async getAgent(id: string): Promise<ElizaAgent> {
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id },
      include: {
        LatestMarketData: true, // Include related data
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

  async stopAgent(id: string): Promise<void> {
    const agent = await this.prisma.elizaAgent.findUnique({ where: { id } });
    if (agent && agent.containerId) {
      await this.dockerService.stopContainer(agent.containerId);
      await this.prisma.elizaAgent.update({
        where: { id },
        data: { status: AgentStatus.STARTING },
      });
    }
  }

  async startAgent(id: string): Promise<void> {
    const agent = await this.prisma.elizaAgent.findUnique({ where: { id } });
    if (agent && agent.containerId) {
      await this.dockerService.startContainer(agent.containerId);
      await this.prisma.elizaAgent.update({
        where: { id },
        data: { status: AgentStatus.RUNNING },
      });
    }
  }

  async updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData>,
  ): Promise<ElizaAgent> {
    return this.prisma.elizaAgent.update({
      where: { id: agentId },
      data: {
        LatestMarketData: {
          update: {
            ...marketData,
            updatedAt: new Date(),
          },
        },
      },
      include: {
        LatestMarketData: true,
      },
    });
  }
}
