import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AccountBalanceTokens,
  IAccountBalance,
} from '../../domains/kpi/interfaces';

@Injectable()
export class SyncPerformanceMetricsTask {
  private readonly logger = new Logger(SyncPerformanceMetricsTask.name);

  constructor(
    @Inject(AccountBalanceTokens.AccountBalance)
    private readonly kpiService: IAccountBalance,
    private readonly prisma: PrismaService,
  ) {
    // Run the task immediately when the server starts
    this.execute();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async execute(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🔄 Starting performance metrics sync');

    try {
      // Get all agents with LatestMarketData
      const agents = await this.prisma.elizaAgent.findMany({
        include: {
          LatestMarketData: true,
        },
      });

      let updatedCount = 0;
      let skippedCount = 0;

      // Get all PnL data at once for efficiency
      // Forcer le rafraîchissement du cache pour obtenir des données à jour
      const allPnlData = await this.kpiService.getAllAgentsPnL(true);

      // Create a map for quick lookups
      const pnlDataMap = new Map();
      allPnlData.forEach((data) => {
        pnlDataMap.set(data.agentId, data);
      });

      // Sync metrics for each agent
      for (const agent of agents) {
        try {
          // Get PnL data from map
          const pnlData = pnlDataMap.get(agent.id) || {
            pnl: 0,
            pnlPercentage: 0,
          };

          // Get portfolio data for balance calculation
          let balanceInUSD = 0;
          try {
            const portfolioData = await this.kpiService.getAgentPortfolio(
              agent.runtimeAgentId || agent.id,
            );
            balanceInUSD = portfolioData.balanceInUSD || 0;
          } catch (error) {
            this.logger.warn(
              `Could not get portfolio for agent ${agent.id}: ${error.message}`,
            );
          }

          // Get trade count
          const tradeCount = await this.prisma.tradingInformation.count({
            where: { elizaAgentId: agent.id },
          });

          // Calculate 24h PnL properly instead of relying on snapshots
          let pnl24h = 0;
          try {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            // Get the closest balance record to 24 hours ago (could be before or after)
            const balance24hAgo = await this.prisma.paradexAccountBalance.findFirst({
              where: { 
                agentId: agent.id,
                createdAt: { lte: twentyFourHoursAgo }
              },
              orderBy: { createdAt: 'desc' }
            });

            if (balance24hAgo) {
              // Get current portfolio balance (calculated)
              const currentPortfolio = await this.kpiService.getAgentPortfolio(
                agent.runtimeAgentId || agent.id,
              );
              const currentBalance = currentPortfolio.calculatedBalanceUSD || currentPortfolio.balanceInUSD || 0;

              // Get 24h ago balance (use stored value for historical comparison)
              const balance24hAgoValue = balance24hAgo.balanceInUSD;

              pnl24h = currentBalance - balance24hAgoValue;
              this.logger.debug(
                `Calculated 24h PnL for agent ${agent.id}: ${pnl24h} (${balance24hAgoValue} -> ${currentBalance})`
              );
            } else {
              this.logger.debug(`No balance data from 24h ago for agent ${agent.id}`);
            }
          } catch (error) {
            this.logger.warn(
              `Could not calculate 24h PnL for agent ${agent.id}: ${error.message}`
            );
          }

          // Prepare data to update
          const updateData = {
            pnlCycle: pnlData.pnl || 0,
            pnl24h: pnl24h,
            tradeCount: tradeCount,
            tvl: 0, // Keep TVL at 0 per requirements
            balanceInUSD: balanceInUSD, // Use the new field for balance
            updatedAt: new Date(),
          };

          // Update LatestMarketData
          if (agent.LatestMarketData) {
            await this.prisma.latestMarketData.update({
              where: { elizaAgentId: agent.id },
              data: updateData,
            });
          } else {
            // Create if not exists
            await this.prisma.latestMarketData.create({
              data: {
                elizaAgentId: agent.id,
                price: 0,
                priceChange24h: 0,
                holders: 0,
                marketCap: 0,
                bondingStatus: 'BONDING',
                forkCount: 0,
                ...updateData,
              },
            });
          }

          updatedCount++;
          this.logger.debug(
            `Updated metrics for agent ${agent.id} (${agent.name})`,
          );
        } catch (error) {
          skippedCount++;
          this.logger.error(
            `Failed to sync metrics for agent ${agent.id}: ${error.message}`,
          );
        }
      }

      // Sort agents by PnL to determine rankings and update in a separate operation
      const agentsWithMetrics = await this.prisma.elizaAgent.findMany({
        include: {
          LatestMarketData: true,
        },
      });

      const sortedAgents = agentsWithMetrics
        .filter((a) => a.LatestMarketData)
        .sort(
          (a, b) =>
            (b.LatestMarketData.pnlCycle || 0) -
            (a.LatestMarketData.pnlCycle || 0),
        );

      // Update rankings directly in the database
      for (let i = 0; i < sortedAgents.length; i++) {
        const agent = sortedAgents[i];
        const rank = i + 1;

        await this.prisma.latestMarketData.update({
          where: { elizaAgentId: agent.id },
          data: { pnlRank: rank },
        });

        this.logger.debug(
          `Updated rank for agent ${agent.name}: ${rank}, PnL: ${agent.LatestMarketData.pnlCycle}`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Performance metrics sync completed - Updated: ${updatedCount}, Skipped: ${skippedCount}, Duration: ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to complete performance metrics sync (${duration}ms): ${error.message}`,
      );
    }
  }
}
