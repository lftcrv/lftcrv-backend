import { Injectable, Inject } from '@nestjs/common';
import { IElizaAgentCreateService } from '../interfaces';
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
export class ElizaAgentCreateService implements IElizaAgentCreateService {
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
      return this.prisma.elizaAgent.update({
        where: { id: agent.id },
        data: {
          runtimeAgentId,
          status: AgentStatus.RUNNING,
        },
        include: {
          LatestMarketData: true,
        },
      });
    }

    console.warn(`Could not retrieve runtime ID for agent ${agent.id}`);
    return agent;
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
