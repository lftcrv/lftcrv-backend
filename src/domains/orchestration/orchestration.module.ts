import { Module, Global } from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { OrchestrationRegistry } from './services/orchestration-registry.service';
import { StepExecutorRegistry } from './services/step-executor-registry.service';
import { OrchestrationServiceTokens } from './interfaces';
import { OrchestrationController } from './orchestration.controller';

@Global()
@Module({
  controllers: [OrchestrationController],
  providers: [
    {
      provide: OrchestrationServiceTokens.Orchestrator,
      useClass: OrchestratorService,
    },
    {
      provide: OrchestrationServiceTokens.OrchestrationRegistry,
      useClass: OrchestrationRegistry,
    },
    {
      provide: OrchestrationServiceTokens.StepExecutorRegistry,
      useClass: StepExecutorRegistry,
    },
  ],
  exports: [
    OrchestrationServiceTokens.Orchestrator,
    OrchestrationServiceTokens.OrchestrationRegistry,
    OrchestrationServiceTokens.StepExecutorRegistry,
  ],
})
export class OrchestrationModule {}
