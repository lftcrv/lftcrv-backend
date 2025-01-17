import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IElizaAgentService } from '../interfaces/eliza-agent-service.interface';
import { IDockerService } from '../interfaces/docker-service.interface';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ElizaAgent } from '../entities/eliza-agent.entity';
import { AgentStatus } from '@prisma/client';
import { CreateElizaAgentDto } from '../dtos/eliza-agent.dto';

@Injectable()
export class ElizaAgentService implements IElizaAgentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IDockerService') private readonly dockerService: IDockerService,
  ) {}

  async createAgent(dto: CreateElizaAgentDto): Promise<ElizaAgent> {
    const containerId = await this.dockerService.createContainer({
      name: dto.name,
      characterConfig: dto.characterConfig,
    });

    const agent = await this.prisma.elizaAgent.create({
      data: {
        name: dto.name,
        curveSide: dto.curveSide,
        status: AgentStatus.STARTING,
        containerId,
        characterConfig: dto.characterConfig,
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
      });
      return updatedAgent;
    }

    // If we really didn't retrieve agent ID, we still return the agent
    console.warn(`Could not retrieve runtime ID for agent ${agent.id}`);
    return agent;
  }

  async getAgent(id: string): Promise<ElizaAgent> {
    const agent = await this.prisma.elizaAgent.findUnique({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async listAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany();
  }

  async listRunningAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      where: { status: AgentStatus.RUNNING },
    });
  }

  async listLatestAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany({
      orderBy: { createdAt: 'desc' },
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
}
