import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { DockerService } from './services/docker.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ServiceTokens } from './interfaces';
import { ElizaAgentQueryService } from './services/eliza-agent-query.service';
import { ElizaAgentLifecycleService } from './services/eliza-agent-lifecycle.service';
import { CreateDbRecordStep } from './orchestration/steps/db-record.step';
import { CreateContainerStep } from './orchestration/steps/create-container.step';
import { StartContainerStep } from './orchestration/steps/start-container.step';
import {
  IOrchestrationDefinitionRegistry,
  IStepExecutorRegistry,
  OrchestrationServiceTokens,
} from '../orchestration/interfaces';
import { AGENT_CREATION_DEFINITION } from './orchestration/agent-creation.definition';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [OrchestrationModule],
  controllers: [ElizaAgentController],
  providers: [
    CreateDbRecordStep,
    CreateContainerStep,
    StartContainerStep,
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
export class ElizaAgentModule implements OnModuleInit {
  constructor(
    @Inject(OrchestrationServiceTokens.OrchestrationRegistry)
    private readonly definitionRegistry: IOrchestrationDefinitionRegistry,
    @Inject(OrchestrationServiceTokens.StepExecutorRegistry)
    private readonly executorRegistry: IStepExecutorRegistry,
    private readonly createDbRecordStep: CreateDbRecordStep,
    private readonly createContainerStep: CreateContainerStep,
    private readonly startContainerStep: StartContainerStep,
  ) {}

  onModuleInit() {
    // Register orchestration definition
    this.definitionRegistry.register(AGENT_CREATION_DEFINITION);

    // Register step executors
    this.executorRegistry.register(this.createDbRecordStep);
    this.executorRegistry.register(this.createContainerStep);
    this.executorRegistry.register(this.startContainerStep);
  }
}
