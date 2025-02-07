import { MessageService } from '../message/message.service';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  AgentTokenTokens,
  IQueryAgentToken,
} from '../domains/agent-token/interfaces';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
    @Inject(AgentTokenTokens.QueryAgentToken)
    private readonly tokenService: IQueryAgentToken,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const startTime = Date.now();
    this.logger.log('🚀 Start sending messages to active agents');
    try {
      await this.messageService.sendMessagesToRunningAgents();
      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully sent messages to active agents (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to send messages to active agents (${duration}ms): ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateTokenPrices() {
    const startTime = Date.now();
    this.logger.log('📊 Starting token price update cycle');
    try {
      const tokens = await this.prisma.agentToken.findMany();
      let successCount = 0;
      let failureCount = 0;

      for (const token of tokens) {
        try {
          const currentPrice = await this.tokenService.getCurrentPrice(
            token.elizaAgentId,
          );
          const marketCap = await this.tokenService.getMarketCap(
            token.elizaAgentId,
          );
          const bondingPercentage =
            await this.tokenService.bondingCurvePercentage(token.elizaAgentId);

          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const oldPrice = await this.prisma.priceForToken.findFirst({
            where: {
              tokenId: token.id,
              timestamp: { lte: oneDayAgo },
            },
            orderBy: { timestamp: 'desc' },
          });

          const priceChange24h = oldPrice
            ? ((Number(currentPrice) - Number(oldPrice.price)) /
                Number(oldPrice.price)) *
              100
            : 0;

          await this.prisma.priceForToken.create({
            data: {
              tokenId: token.id,
              price: currentPrice.toString(),
              timestamp: new Date(),
            },
          });

          await this.prisma.$executeRaw`
            UPDATE "latest_market_data"
            SET 
              "price" = ${Number(currentPrice)},
              "priceChange24h" = ${priceChange24h},
              "marketCap" = ${Number(marketCap) / 1e6},
              "bondingStatus" = ${bondingPercentage >= 100 ? 'LIVE' : 'BONDING'}::"BondingStatus",
              "updatedAt" = ${new Date()}
            WHERE "elizaAgentId" = ${token.elizaAgentId}
          `;

          successCount++;
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to update data for token ${token.symbol}: ${error.message}`,
          );
        }
      }

      const totalDuration = Date.now() - startTime;
      this.logger.log(
        `📊 Token price update cycle completed - Success: ${successCount}, Failed: ${failureCount}, Total Duration: ${totalDuration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to update token data (${duration}ms):`,
        error.stack,
      );
    }
  }
}
