import { Injectable, Inject } from '@nestjs/common';
import { IElizaAgentLifecycleService } from '../interfaces';
import { IDockerService } from '../interfaces/docker-service.interface';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AgentStatus } from '../entities/eliza-agent.entity';
import { ServiceTokens } from '../interfaces';

@Injectable()
export class ElizaAgentLifecycleService implements IElizaAgentLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ServiceTokens.Docker)
    private readonly dockerService: IDockerService,
  ) {}

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
