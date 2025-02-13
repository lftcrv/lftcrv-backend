// domains/eliza-agent/eliza-agent.module.ts
import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ElizaAgentController } from './eliza-agent.controller';
import { DockerService } from './services/docker.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ServiceTokens } from './interfaces';
import { ElizaAgentQueryService } from './services/eliza-agent-query.service';
import { ElizaAgentLifecycleService } from './services/eliza-agent-lifecycle.service';
import { CreateDbRecordStep } from './orchestration/steps/db-record.step';
import { CreateWalletStep } from './orchestration/steps/create-wallet.step';
import { FundWalletStep } from './orchestration/steps/fund-wallet.step';
import { DeployWalletStep } from './orchestration/steps/deploy-wallet.step';
import { CreateContainerStep } from './orchestration/steps/create-container.step';
import { StartContainerStep } from './orchestration/steps/start-container.step';
import { DeployAgentTokenStep } from './orchestration/steps/deploy-agent-token';
import { FileUploadService } from './services/file-upload.service';
import {
  IOrchestrationDefinitionRegistry,
  IStepExecutorRegistry,
  OrchestrationServiceTokens,
} from '../orchestration/interfaces';
import { AGENT_CREATION_DEFINITION } from './orchestration/agent-creation.definition';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { StarknetModule } from '../blockchain/starknet/starknet.module';
import { ElizaConfigService } from './services/eliza-config.service';
import { AgentTokenModule } from '../agent-token/agent-token.module';

@Module({
  imports: [OrchestrationModule, StarknetModule, AgentTokenModule],
  controllers: [ElizaAgentController],
  providers: [
    CreateDbRecordStep,
    CreateWalletStep,
    FundWalletStep,
    DeployWalletStep,
    CreateContainerStep,
    StartContainerStep,
    DeployAgentTokenStep,
    FileUploadService,
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
})
export class ElizaAgentModule implements OnModuleInit {
  constructor(
    @Inject(OrchestrationServiceTokens.OrchestrationRegistry)
    private readonly definitionRegistry: IOrchestrationDefinitionRegistry,
    @Inject(OrchestrationServiceTokens.StepExecutorRegistry)
    private readonly executorRegistry: IStepExecutorRegistry,
    private readonly createDbRecordStep: CreateDbRecordStep,
    private readonly createWalletStep: CreateWalletStep,
    private readonly fundWalletStep: FundWalletStep,
    private readonly deployWalletStep: DeployWalletStep,
    private readonly createContainerStep: CreateContainerStep,
    private readonly startContainerStep: StartContainerStep,
    private readonly deployAgentTokenStep: DeployAgentTokenStep,
  ) {}

  onModuleInit() {
    // Register orchestration definition
    this.definitionRegistry.register(AGENT_CREATION_DEFINITION);

    // Register step executors
    this.executorRegistry.register(this.createDbRecordStep);
    this.executorRegistry.register(this.createWalletStep);
    this.executorRegistry.register(this.fundWalletStep);
    this.executorRegistry.register(this.deployWalletStep);
    this.executorRegistry.register(this.createContainerStep);
    this.executorRegistry.register(this.startContainerStep);
    this.executorRegistry.register(this.deployAgentTokenStep);
  }
}
