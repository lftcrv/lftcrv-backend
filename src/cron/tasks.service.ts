import { MessageService } from '../message/message.service';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  AgentTokenTokens,
  IQueryAgentToken,
} from '../domains/agent-token/interfaces';
import { ElizaAgent, AgentStatus } from '@prisma/client';

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
      await this.messageService.sendStarknetMessageToRunningAgents();
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

  @Cron(CronExpression.EVERY_HOUR)
  async sendActOnParadexMessage() {
    const startTime = Date.now();
    this.logger.log('🚀 Sending "EXECUTE ACT_ON_PARADEX" to active agents');
    try {
      const runningAgents: ElizaAgent[] = await this.prisma.elizaAgent.findMany(
        {
          where: {
            status: AgentStatus.RUNNING,
            runtimeAgentId: { not: null },
            port: { not: null },
          },
        },
      );

      this.logger.debug(`Found ${runningAgents.length} running agents`);
      if (runningAgents.length === 0) {
        this.logger.warn('⚠️ No active agent found.');
        return;
      }

      for (const agent of runningAgents) {
        await this.messageService.sendMessageToAgent(agent.runtimeAgentId, {
          content: {
            text: 'Analyze current market conditions on Paradex and execute the optimal trading strategy. Review markets conditions, evaluate open positions and orders, and take appropriate actions (place/cancel orders) based on current price movements, volatility trends, and technical indicators. Focus on maximizing profit while managing risk exposure. Make trading decisions that align with your personality, bio, lore, and knowledge. Provide clear explanations for all trading decisions that reflect your unique perspective and character traits.',
          },
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Successfully sent "EXECUTE ACT_ON_PARADEX" to active agents (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Failed to send "EXECUTE ACT_ON_PARADEX" to active agents (${duration}ms): ${error.message}`,
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
