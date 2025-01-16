import { Injectable, Inject } from '@nestjs/common';
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
        status: AgentStatus.STARTING,
        containerId,
        characterConfig: dto.characterConfig,
      },
    });

    await this.dockerService.startContainer(containerId);

    return agent;
  }

  async getAgent(id: string): Promise<ElizaAgent> {
    return this.prisma.elizaAgent.findUnique({ where: { id } });
  }

  async listAgents(): Promise<ElizaAgent[]> {
    return this.prisma.elizaAgent.findMany();
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
