import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccountBalanceTokens, IPnLCalculation } from '../interfaces/kpi.interface';

@Injectable()
export class PerformanceSnapshotService {
  private readonly logger = new Logger(PerformanceSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AccountBalanceTokens.PnLCalculation)
    private readonly pnlCalculationService: IPnLCalculation,
  ) {}

  /**
   * Creates a performance snapshot for a specific agent
   */
  async createAgentPerformanceSnapshot(agentId: string): Promise<any> {
    this.logger.log(
      `Creating performance snapshot for agent with ID: ${agentId}`,
    );

    // Get agent data
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
      include: { LatestMarketData: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Get calculated balance using enhanced Prisma service
    const enhancedClient = this.prisma.getEnhanced();
    const calculatedBalance = await enhancedClient.portfolioCalculations.getLatestAgentBalance(agentId);
    const currentBalanceUSD = calculatedBalance ? Number(calculatedBalance.calculated_balance_usd) : 0;

    // Récupérer les données de PnL depuis le nouveau service en forçant le rafraîchissement
    const pnlData = await this.pnlCalculationService.getAgentPnL(
      agent.runtimeAgentId,
      true
    );

    // Calculer le PnL 24h en utilisant les balances des dernières 24h
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get balances from the last 24 hours and calculate with enhanced service
    const balances24h = await this.prisma.$queryRaw`
      SELECT * FROM paradex_account_balances 
      WHERE "agentId" = ${agent.id} 
        AND "createdAt" >= ${twentyFourHoursAgo}
      ORDER BY "createdAt" ASC
    `;

    // Calculate PnL for the last 24 hours using calculated values
    const pnlData24h = await this.calculatePnLFromBalancesWithCalculatedValues(balances24h as any[]);
    // If no data in the last 24 hours, use the existing pnl24h value from LatestMarketData
    const pnl24h = pnlData24h.pnl || agent.LatestMarketData?.pnl24h || 0;

    // Create snapshot with all KPIs directly using $queryRaw - use calculated balance
    await this.prisma.$executeRaw`
      INSERT INTO "agent_performance_snapshots" (
        id, 
        "agentId", 
        timestamp, 
        "balanceInUSD", 
        pnl, 
        "pnlPercentage", 
        pnl24h, 
        "pnlCycle", 
        "tradeCount", 
        tvl, 
        price, 
        "marketCap"
      ) VALUES (
        gen_random_uuid(), 
        ${agent.id}, 
        now(), 
        ${currentBalanceUSD}, 
        ${pnlData.pnl || 0}, 
        ${pnlData.pnlPercentage || 0}, 
        ${pnl24h}, 
        ${agent.LatestMarketData?.pnlCycle || 0}, 
        ${agent.LatestMarketData?.tradeCount || 0}, 
        ${agent.LatestMarketData?.tvl || 0}, 
        ${agent.LatestMarketData?.price || 0}, 
        ${agent.LatestMarketData?.marketCap || 0}
      )
    `;

    // Update or create the LatestMarketData with the calculated balance and 24h PnL
    if (agent.LatestMarketData) {
      // Update existing record with calculated balance
      await this.prisma.latestMarketData.update({
        where: { elizaAgentId: agent.id },
        data: {
          pnl24h,
          balanceInUSD: currentBalanceUSD,
        },
      });
    } else {
      // Create new record with calculated balance
      await this.prisma.latestMarketData.create({
        data: {
          elizaAgentId: agent.id,
          pnl24h,
          balanceInUSD: currentBalanceUSD,
          price: 0,
          priceChange24h: 0,
          holders: 0,
          marketCap: 0,
          bondingStatus: 'BONDING',
          forkCount: 0,
          pnlCycle: 0,
          tradeCount: 0,
          tvl: 0,
        },
      });
    }

    // Calculate and update pnlRank for all agents
    await this.updateAgentRankings();

    this.logger.log(`Created performance snapshot for agent ${agentId}`);

    // Return the inserted data for API response with calculated balance
    return {
      agentId: agent.id,
      timestamp: new Date(),
      balanceInUSD: currentBalanceUSD,
      pnl: pnlData.pnl || 0,
      pnlPercentage: pnlData.pnlPercentage || 0,
      pnl24h,
      pnlCycle: agent.LatestMarketData?.pnlCycle || 0,
      tradeCount: agent.LatestMarketData?.tradeCount || 0,
      tvl: agent.LatestMarketData?.tvl || 0,
      price: agent.LatestMarketData?.price || 0,
      marketCap: agent.LatestMarketData?.marketCap || 0,
    };
  }

  /**
   * Updates the pnlRank for all agents based on their pnlCycle values
   */
  private async updateAgentRankings(): Promise<void> {
    this.logger.log('Updating agent rankings based on pnlCycle');

    // Get all active agents with their latest market data, ordered by pnlCycle desc
    const agentsWithRanking = await this.prisma.latestMarketData.findMany({
      select: {
        id: true,
        elizaAgentId: true,
        pnlCycle: true,
      },
      orderBy: {
        pnlCycle: 'desc',
      },
    });

    // Update rank for each agent
    let currentRank = 1;
    for (const agent of agentsWithRanking) {
      await this.prisma.latestMarketData.update({
        where: { id: agent.id },
        data: { pnlRank: currentRank },
      });
      currentRank++;
    }

    this.logger.log(`Updated rankings for ${agentsWithRanking.length} agents`);
  }

  /**
   * Get historical performance data for an agent
   */
  async getAgentPerformanceHistory(
    agentId: string,
    fromDate?: string,
    toDate?: string,
    interval: 'hourly' | 'daily' | 'weekly' = 'daily',
  ): Promise<any> {
    this.logger.log(
      `Retrieving performance history for agent with ID: ${agentId}, interval: ${interval}`,
    );

    try {
      // Validate agent exists
      const agent = await this.prisma.elizaAgent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new NotFoundException(`Agent with ID ${agentId} not found`);
      }

      // Build the where condition
      const where: any = { agentId };

      if (fromDate) {
        where.timestamp = {
          ...where.timestamp,
          gte: new Date(fromDate),
        };
      }

      if (toDate) {
        where.timestamp = {
          ...where.timestamp,
          lte: new Date(toDate),
        };
      }

      // For hourly, we just fetch all data points
      const snapshots = await this.prisma.agentPerformanceSnapshot.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      // For daily or weekly, we need to post-process the data
      if (interval !== 'hourly' && snapshots.length > 0) {
        const aggregated = this.aggregateSnapshotsByInterval(
          snapshots,
          interval,
        );
        return {
          agentId,
          interval,
          snapshots: aggregated,
        };
      }

      return {
        agentId,
        interval,
        snapshots: snapshots || [],
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving performance history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Aggregate snapshots by interval (daily or weekly)
   */
  private aggregateSnapshotsByInterval(
    snapshots: any[],
    interval: 'daily' | 'weekly',
  ): any[] {
    this.logger.log(
      `Aggregating ${snapshots.length} snapshots by ${interval} interval`,
    );

    // TEMPORARY OVERRIDE: Return each snapshot as-is for testing purposes
    // This will show each snapshot separately in the history
    return snapshots.map((snapshot) => {
      return {
        timestamp: snapshot.timestamp,
        balanceInUSD: snapshot.balanceInUSD,
        pnl: snapshot.pnl,
        pnlPercentage: snapshot.pnlPercentage,
        pnl24h: snapshot.pnl24h,
        pnlCycle: snapshot.pnlCycle,
        tradeCount: snapshot.tradeCount,
        tvl: snapshot.tvl,
        price: snapshot.price,
        marketCap: snapshot.marketCap,
        dataPoints: 1, // Each snapshot is one data point
      };
    });

    /* Original aggregation code remains here for future reference
    const aggregateMap = new Map();

    // Group by day or week
    snapshots.forEach((snapshot) => {
      const date = new Date(snapshot.timestamp);

      // Set to beginning of day or week
      let periodStart;
      if (interval === 'daily') {
        periodStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
      } else {
        // Get start of week (Sunday)
        const dayOfWeek = date.getDay();
        periodStart = new Date(date);
        periodStart.setDate(date.getDate() - dayOfWeek);
        periodStart = new Date(
          periodStart.getFullYear(),
          periodStart.getMonth(),
          periodStart.getDate(),
        );
      }

      const periodKey = periodStart.toISOString();

      if (!aggregateMap.has(periodKey)) {
        aggregateMap.set(periodKey, {
          period: periodStart,
          count: 0,
          balanceInUSD: 0,
          pnl: 0,
          pnlPercentage: 0,
          pnl24h: 0,
          pnlCycle: 0,
          tradeCount: 0,
          tvl: 0,
          price: 0,
          marketCap: 0,
        });
      }

      const periodData = aggregateMap.get(periodKey);
      periodData.count++;
      periodData.balanceInUSD += snapshot.balanceInUSD;
      periodData.pnl += snapshot.pnl;
      periodData.pnlPercentage += snapshot.pnlPercentage;
      periodData.pnl24h += snapshot.pnl24h;
      periodData.pnlCycle = snapshot.pnlCycle; // Use the latest
      periodData.tradeCount = snapshot.tradeCount; // Use the latest
      periodData.tvl = snapshot.tvl; // Use the latest
      periodData.price = snapshot.price; // Use the latest
      periodData.marketCap = snapshot.marketCap; // Use the latest
    });

    // Calculate averages and format for response
    const aggregatedResults = [];
    aggregateMap.forEach((data, key) => {
      aggregatedResults.push({
        timestamp: data.period.toISOString(),
        balanceInUSD: data.balanceInUSD / data.count,
        pnl: data.pnl / data.count,
        pnlPercentage: data.pnlPercentage / data.count,
        pnl24h: data.pnl24h / data.count,
        pnlCycle: data.pnlCycle,
        tradeCount: data.tradeCount,
        tvl: data.tvl,
        price: data.price,
        marketCap: data.marketCap,
        dataPoints: data.count,
      });
    });

    return aggregatedResults.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    */
  }

  /**
   * Apply data retention policy
   * - Keep hourly data for 7 days
   * - Keep daily data for 90 days
   * - Weekly data is kept indefinitely
   */
  async applyDataRetentionPolicy(): Promise<{ deleted: number }> {
    this.logger.log('Applying data retention policy to performance snapshots');

    // Calculate retention dates
    const hourlyRetentionDate = new Date();
    hourlyRetentionDate.setDate(hourlyRetentionDate.getDate() - 7);

    const dailyRetentionDate = new Date();
    dailyRetentionDate.setDate(dailyRetentionDate.getDate() - 90);

    // Delete snapshots with high frequency that are older than retention period
    // Strategy: Delete hourly data points that aren't at midnight (to keep daily data points)
    const deleted = await this.prisma.$executeRaw`
      DELETE FROM "agent_performance_snapshots"
      WHERE 
        ((timestamp < ${hourlyRetentionDate} AND extract(hour from timestamp) != 0) OR
         (timestamp < ${dailyRetentionDate}))
    `;

    this.logger.log(`Deleted ${deleted} outdated performance snapshots`);
    return { deleted };
  }

  /**
   * Helper method to calculate PnL from balance history
   */
  private calculatePnLFromBalances(balances: any[]): any {
    if (balances.length === 0) {
      return {
        pnl: 0,
        pnlPercentage: 0,
        firstBalance: null,
        latestBalance: null,
      };
    }

    const firstBalance = balances[0];
    const latestBalance = balances[balances.length - 1];

    const pnl = latestBalance.balanceInUSD - firstBalance.balanceInUSD;

    const pnlPercentage =
      firstBalance.balanceInUSD !== 0
        ? (pnl / firstBalance.balanceInUSD) * 100
        : 0;

    return {
      pnl,
      pnlPercentage,
      firstBalance: firstBalance.balanceInUSD,
      latestBalance: latestBalance.balanceInUSD,
      firstBalanceDate: firstBalance.createdAt,
      latestBalanceDate: latestBalance.createdAt,
    };
  }

  /**
   * Helper method to calculate PnL from balance history using calculated values
   */
  private async calculatePnLFromBalancesWithCalculatedValues(
    balances: any[]
  ): Promise<any> {
    if (balances.length === 0) {
      return {
        pnl: 0,
        pnlPercentage: 0,
        firstBalance: null,
        latestBalance: null,
      };
    }

    // Use enhanced Prisma service to get calculated values for each balance record
    const enhancedClient = this.prisma.getEnhanced();
    
    try {
      // Calculate first balance using enhanced service
      const firstBalanceRecord = balances[0];
      const firstCalculatedBalance = await enhancedClient.portfolioCalculations.getAccountBalanceWithPrices(
        firstBalanceRecord.id
      );
      const firstBalance = firstCalculatedBalance ? Number(firstCalculatedBalance.calculated_balance_usd) : firstBalanceRecord.balanceInUSD;

      // Calculate latest balance using enhanced service
      const latestBalanceRecord = balances[balances.length - 1];
      const latestCalculatedBalance = await enhancedClient.portfolioCalculations.getAccountBalanceWithPrices(
        latestBalanceRecord.id
      );
      const latestBalance = latestCalculatedBalance ? Number(latestCalculatedBalance.calculated_balance_usd) : latestBalanceRecord.balanceInUSD;

      const pnl = latestBalance - firstBalance;
      const pnlPercentage = firstBalance !== 0 ? (pnl / firstBalance) * 100 : 0;

      this.logger.debug(
        `24h PnL calculated: ${pnl} (${firstBalance} -> ${latestBalance}), percentage: ${pnlPercentage}%`
      );

      return {
        pnl,
        pnlPercentage,
        firstBalance,
        latestBalance,
        firstBalanceDate: firstBalanceRecord.createdAt,
        latestBalanceDate: latestBalanceRecord.createdAt,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to calculate 24h PnL with enhanced service, falling back to stored values: ${error.message}`
      );
      
      // Fallback to stored values if enhanced calculation fails
      const firstBalance = balances[0];
      const latestBalance = balances[balances.length - 1];

      const pnl = latestBalance.balanceInUSD - firstBalance.balanceInUSD;
      const pnlPercentage = firstBalance.balanceInUSD !== 0 ? (pnl / firstBalance.balanceInUSD) * 100 : 0;

      return {
        pnl,
        pnlPercentage,
        firstBalance: firstBalance.balanceInUSD,
        latestBalance: latestBalance.balanceInUSD,
        firstBalanceDate: firstBalance.createdAt,
        latestBalanceDate: latestBalance.createdAt,
      };
    }
  }
}
