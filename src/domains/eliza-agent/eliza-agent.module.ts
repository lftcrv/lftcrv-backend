import { Module } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { ElizaAgentService } from './services/eliza-agent.service';
import { DockerService } from './services/docker.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Module({
  controllers: [ElizaAgentController],
  providers: [
    {
      provide: 'IElizaAgentService',
      useClass: ElizaAgentService,
    },
    {
      provide: 'IDockerService',
      useClass: DockerService,
    },
    PrismaService
  ],
})
export class ElizaAgentModule {}
