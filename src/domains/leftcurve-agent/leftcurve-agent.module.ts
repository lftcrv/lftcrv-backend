import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ElizaAgentController } from './leftcurve-agent.controller';
import { DockerService } from './services/docker.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ServiceTokens } from './interfaces';
import { ElizaAgentQueryService } from './services/leftcurve-agent-query.service';
import { ElizaAgentLifecycleService } from './services/leftcurve-agent-lifecycle.service';
import { CreateDbRecordStep } from './orchestration/steps/db-record.step';
import { CreateContainerStep } from './orchestration/steps/create-container.step';
import { StartContainerStep } from './orchestration/steps/start-container.step';
import { FileUploadService } from './services/file-upload.service';
import {
  IOrchestrationDefinitionRegistry,
  IStepExecutorRegistry,
  OrchestrationServiceTokens,
} from '../orchestration/interfaces';
import { AGENT_CREATION_DEFINITION } from './orchestration/agent-creation.definition';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { ElizaConfigService } from './services/leftcurve-config.service';
import { MessageModule } from 'src/message/message.module';
import { MockWalletService } from './services/mock-wallet.service';
import { ConfigModule } from '@nestjs/config';
import { CryptoSelectionService } from './utils/crypto_selection';
import { PerformanceSnapshotService } from '../kpi/services/performance-snapshot.service';

@Module({
  imports: [OrchestrationModule, ConfigModule, MessageModule],
  controllers: [ElizaAgentController],
  providers: [
    CreateDbRecordStep,
    CreateContainerStep,
    StartContainerStep,
    FileUploadService,
    MockWalletService,
    CryptoSelectionService,
    PerformanceSnapshotService,
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
    {
      provide: ServiceTokens.ElizaConfig,
      useClass: ElizaConfigService,
    },
    PrismaService,
  ],
  exports: [
    {
      provide: ServiceTokens.ElizaAgentQuery,
      useClass: ElizaAgentQueryService,
    },
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
