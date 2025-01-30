import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { MessageModule } from '../message/message.module';

@Module({
    imports: [ScheduleModule.forRoot(), MessageModule],
    providers: [TasksService],
})
export class TasksModule { }
