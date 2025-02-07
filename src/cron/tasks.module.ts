import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { MessageModule } from '../message/message.module';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AgentTokenModule } from '../domains/agent-token/agent-token.module';
import { BlockchainModule } from '../shared/blockchain/blockchain.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MessageModule,
    PrismaModule,
    AgentTokenModule,
    BlockchainModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
