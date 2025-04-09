import { MessageService } from '../message/message.service';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  AgentTokenTokens,
  IQueryAgentToken,
} from '../domains/agent-token/interfaces';
import { ElizaAgent, AgentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PerformanceSnapshotService } from '../domains/kpi/services/performance-snapshot.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
    @Inject(AgentTokenTokens.QueryAgentToken)
    private readonly tokenService: IQueryAgentToken,
    private readonly configService: ConfigService,
    private readonly performanceSnapshotService: PerformanceSnapshotService,
  ) {
    const host = this.configService.get<string>('HOST_BACKEND');
    const port = this.configService.get<string>('BACKEND_PORT');

    this.apiUrl = `http://${host}:${port}`;
    this.apiKey = this.configService.get<string>('BACKEND_API_KEY');
  }

  // @Cron(CronExpression.EVERY_HOUR)
  // async handleCron() {
  //   const startTime = Date.now();
  //   this.logger.log('Start sending messages to active agents');
  //   try {
  //     await this.messageService.sendStarknetMessageToRunningAgents();
  //     const duration = Date.now() - startTime;
  //     this.logger.log(
  //       `Successfully sent messages to active agents (${duration}ms)`,
  //     );
  //   } catch (error) {
  //     const duration = Date.now() - startTime;
  //     this.logger.error(
  //       `Failed to send messages to active agents (${duration}ms): ${error.message}`,
  //     );
  //   }
  // }

  // @Cron(CronExpression.EVERY_HOUR)
  // async sendActOnParadexMessage() {
  //   const startTime = Date.now();
  //   this.logger.log('Sending "EXECUTE ACT_ON_PARADEX" to active agents');
  //   try {
  //     const runningAgents: ElizaAgent[] = await this.prisma.elizaAgent.findMany(
  //       {
  //         where: {
  //           status: AgentStatus.RUNNING,
  //           runtimeAgentId: { not: null },
  //           port: { not: null },
  //         },
  //       },
  //     );

  //     this.logger.debug(`Found ${runningAgents.length} running agents`);
  //     if (runningAgents.length === 0) {
  //       this.logger.warn('⚠️ No active agent found.');
  //       return;
  //     }

  //     for (const agent of runningAgents) {
  //       await this.messageService.sendMessageToAgent(agent.runtimeAgentId, {
  //         content: {
  //           text: 'Analyze current market conditions on Paradex and execute the optimal trading strategy. Review markets conditions, evaluate open positions and orders, and take appropriate actions (place/cancel orders) based on current price movements, volatility trends, and technical indicators. Focus on maximizing profit while managing risk exposure. Make trading decisions that align with your personality, bio, lore, and knowledge. Provide clear explanations for all trading decisions that reflect your unique perspective and character traits.',
  //         },
  //       });
  //     }

  //     const duration = Date.now() - startTime;
  //     this.logger.log(
  //       `Successfully sent "EXECUTE ACT_ON_PARADEX" to active agents (${duration}ms)`,
  //     );
  //   } catch (error) {
  //     const duration = Date.now() - startTime;
  //     this.logger.error(
  //       `Failed to send "EXECUTE ACT_ON_PARADEX" to active agents (${duration}ms): ${error.message}`,
  //     );
  //   }
  // }

  @Cron(CronExpression.EVERY_HOUR)
  async sendTradeSimulation() {
    const startTime = Date.now();
    this.logger.log('Sending trading simulation order to active agents');
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
            text: "Review the current market conditions on Paradex and consider whether to execute a trade based on your unique perspective. With your specific background and trading philosophy, what action feels right at this moment? Examine just the most significant technical indicators that align with your expertise, not all available data. If you see a compelling opportunity that matches your risk tolerance and trading style, simulate a spot trade. However, if current conditions don t match your personal criteria or intuition, it s perfectly acceptable to wait for a better entry point. Explain your reasoning in your own voice - focus on the 1-2 key factors that influenced your decision most, rather than listing all technical indicators. Your explanation should reflect how you specifically approach the market, highlighting your unique character traits and trading philosophy.",
          },
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully sent trading simulation order to active agents (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to send trading simulation order to active agents (${duration}ms): ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateParadexAnalysis() {
    const startTime = Date.now();
    this.logger.log('Starting Paradex asset analysis generation');

    try {
      const response = await axios.post(
        `${this.apiUrl}/analysis/generate`,
        {},
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          params: {
            assets: 'BTC,ETH,STRK,AAVE,AI16Z',
            platform: 'paradex',
          },
        },
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Paradex asset analysis generated successfully - Status: ${response.status}, Duration: ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to generate Paradex asset analysis (${duration}ms): ${error.message}`,
      );
    }
  }

  @Cron('10 */4 * * *')
  async generateAvnuAnalysis() {
    const startTime = Date.now();
    this.logger.log('Starting AVNU asset analysis generation');

    try {
      const response = await axios.post(
        `${this.apiUrl}/analysis/generate`,
        {},
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          params: {
            assets: 'BROTHER,STRK,LORDS,USDC,ETH,UNI',
            platform: 'avnu',
          },
        },
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `AVNU asset analysis generated successfully - Status: ${response.status}, Duration: ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to generate AVNU asset analysis (${duration}ms): ${error.message}`,
      );
    }
  }

  /**
   * Update agent performance snapshots every hour
   * This captures historical data for agent performance metrics including PnL
   */
  @Cron('0 * * * *') // Run every hour at minute 0
  async updateAgentPerformanceSnapshots() {
    const startTime = Date.now();
    this.logger.log('Starting agent performance snapshot updates');
    
    try {
      const agents = await this.prisma.elizaAgent.findMany({
        where: { status: AgentStatus.RUNNING }
      });
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const agent of agents) {
        try {
          await this.performanceSnapshotService.createAgentPerformanceSnapshot(agent.id);
          successCount++;
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to create performance snapshot for agent ${agent.id}: ${error.message}`
          );
        }
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `Performance snapshot updates completed - Success: ${successCount}, Failed: ${failureCount}, Duration: ${duration}ms`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to update agent performance snapshots (${duration}ms): ${error.message}`
      );
    }
  }

  /**
   * Apply data retention policy for performance snapshots daily
   * - Keep hourly data for 7 days
   * - Keep daily data for 90 days
   * - Weekly data is kept indefinitely
   */
  @Cron('0 0 * * *') // Run daily at midnight
  async cleanupPerformanceData() {
    const startTime = Date.now();
    this.logger.log('Starting performance data cleanup');
    
    try {
      const result = await this.performanceSnapshotService.applyDataRetentionPolicy();
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `Performance data cleanup completed - Deleted ${result.deleted} records, Duration: ${duration}ms`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to clean up performance data (${duration}ms): ${error.message}`
      );
    }
  }
}
