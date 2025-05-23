import { Module } from '@nestjs/common';
import { AdminTasksController } from './admin-tasks.controller';
import { TasksService } from '../../cron/tasks.service';
import { MessageService } from '../../message/message.service';
import { AgentTokenModule } from '../../domains/agent-token/agent-token.module';
// import { PerformanceSnapshotService } from '../../domains/kpi/services/performance-snapshot.service'; // No longer directly provided here
import { CreatorsModule } from '../../domains/creators/creators.module';
import { TokenPriceSyncService } from '../../domains/token-price-sync/token-price-sync.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { KPIModule } from '../../domains/kpi/kpi.module';

@Module({
  imports: [AgentTokenModule, CreatorsModule, KPIModule],
  controllers: [AdminTasksController],
  providers: [
    TasksService,
    MessageService,
    TokenPriceSyncService,
    PrismaService,
    ConfigService,
  ],
})
export class AdminTasksModule {}
