import { Module, forwardRef } from '@nestjs/common';
import { KPIController } from './kpi.controller';
import { KPIService } from './services/kpi.service';
import { AccountBalanceTokens } from './interfaces';
import { PerformanceSnapshotService } from './services/performance-snapshot.service';
import { PerformanceSnapshotController } from './controllers/performance-snapshot.controller';
import { MetricsController } from './controllers/metrics.controller';
import { ElizaAgentModule } from '../leftcurve-agent/leftcurve-agent.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { ConfigModule } from '@nestjs/config';
import { PnLCalculationService } from './services/pnl-calculation.service';

@Module({
  imports: [
    forwardRef(() => ElizaAgentModule),
    AnalysisModule,
    ConfigModule,
  ],
  controllers: [
    KPIController,
    PerformanceSnapshotController,
    MetricsController,
  ],
  providers: [
    {
      provide: AccountBalanceTokens.AccountBalance,
      useClass: KPIService,
    },
    {
      provide: AccountBalanceTokens.PnLCalculation,
      useClass: PnLCalculationService,
    },
    PerformanceSnapshotService,
  ],
  exports: [
    {
      provide: AccountBalanceTokens.AccountBalance,
      useClass: KPIService,
    },
    {
      provide: AccountBalanceTokens.PnLCalculation,
      useClass: PnLCalculationService,
    },
    PerformanceSnapshotService,
  ],
})
export class KPIModule {}
