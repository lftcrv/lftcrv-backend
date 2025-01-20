import { Module } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { DockerService } from './services/docker.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ServiceTokens } from './interfaces';
import { ElizaAgentCreateService } from './services/eliza-agent-create.service';
import { ElizaAgentQueryService } from './services/eliza-agent-query.service';
import { ElizaAgentLifecycleService } from './services/eliza-agent-lifecycle.service';

@Module({
  controllers: [ElizaAgentController],
  providers: [
    {
      provide: ServiceTokens.ElizaAgentCreate,
      useClass: ElizaAgentCreateService,
    },
    {
      provide: ServiceTokens.ElizaAgentQuery,
      useClass: ElizaAgentQueryService,
    },
    {
      provide: ServiceTokens.ElizaAgentLifecycle,
      useClass: ElizaAgentLifecycleService,
    },
    {
      provide: ServiceTokens.Docker,
      useClass: DockerService,
    },
    PrismaService,
  ],
})
export class ElizaAgentModule {}
