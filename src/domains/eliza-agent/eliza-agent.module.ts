import { Module } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { ElizaAgentService } from './services/eliza-agent.service';
import { DockerService } from './services/docker.service';

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
  ],
})
export class ElizaAgentModule {}
