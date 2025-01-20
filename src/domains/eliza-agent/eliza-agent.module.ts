import { Module } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { ElizaAgentService } from './services/eliza-agent.service';
import { DockerService } from './services/docker.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ServiceTokens } from './interfaces';

@Module({
  controllers: [ElizaAgentController],
  providers: [
    {
      provide: ServiceTokens.ElizaAgent,
      useClass: ElizaAgentService,
    },
    {
      provide: ServiceTokens.Docker,
      useClass: DockerService,
    },
    PrismaService,
  ],
})
export class ElizaAgentModule {}
