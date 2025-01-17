import { MessageService } from '../message/message.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly messageService: MessageService) {}

  // 🕒 Exécution toutes les minutes
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    this.logger.log('🚀 Lancement de l\'envoi des messages aux agents actifs');
    await this.messageService.sendMessagesToRunningAgents();
  }
}
