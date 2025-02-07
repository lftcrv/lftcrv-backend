import { MessageService } from '../message/message.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly messageService: MessageService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('🚀 Start sending messages to active agents');
    await this.messageService.sendMessagesToRunningAgents();
  }
}
