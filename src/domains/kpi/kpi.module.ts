import { Module } from '@nestjs/common';
import { KPIController } from './kpi.controller';
import { KPIService } from './services/kpi.service';
import { AccountBalanceTokens } from './interfaces';
import { PerformanceSnapshotService } from './services/performance-snapshot.service';
import { PerformanceSnapshotController } from './controllers/performance-snapshot.controller';
import { MetricsController } from './controllers/metrics.controller';

@Module({
  controllers: [KPIController, PerformanceSnapshotController, MetricsController],
  providers: [
    {
      provide: AccountBalanceTokens.AccountBalance,
      useClass: KPIService,
    },
    PerformanceSnapshotService,
  ],
  exports: [
    {
      provide: AccountBalanceTokens.AccountBalance,
      useClass: KPIService,
    },
    PerformanceSnapshotService,
  ],
})
export class KPIModule {}
