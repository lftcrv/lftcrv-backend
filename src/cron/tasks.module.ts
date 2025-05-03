import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { MessageModule } from '../message/message.module';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AgentTokenModule } from '../domains/agent-token/agent-token.module';
import { BlockchainModule } from '../shared/blockchain/blockchain.module';
import { KPIModule } from '../domains/kpi/kpi.module';
import { CreatorsModule } from '../domains/creators/creators.module';
import { SyncPerformanceMetricsTask } from './tasks/sync-performance-metrics.task';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MessageModule,
    PrismaModule,
    AgentTokenModule,
    BlockchainModule,
    KPIModule,
    CreatorsModule,
  ],
  providers: [TasksService, SyncPerformanceMetricsTask],
})
export class TasksModule {}
