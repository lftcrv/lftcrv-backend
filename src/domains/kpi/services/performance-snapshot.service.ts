import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PerformanceSnapshotService {
  private readonly logger = new Logger(PerformanceSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Calculate PnL based on account balances
    const balancesResult = await this.prisma.$queryRaw`
      SELECT * FROM paradex_account_balances 
      WHERE "agentId" = ${agent.id} 
      ORDER BY "createdAt" ASC
    `;

    // Cast the query result to an array
    const balances = balancesResult as any[];

    const pnlData = this.calculatePnLFromBalances(balances);

    // Create snapshot with all KPIs directly using $queryRaw
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
        ${pnlData.latestBalance || 0}, 
        ${pnlData.pnl || 0}, 
        ${pnlData.pnlPercentage || 0}, 
        ${agent.LatestMarketData?.pnl24h || 0}, 
        ${agent.LatestMarketData?.pnlCycle || 0}, 
        ${agent.LatestMarketData?.tradeCount || 0}, 
        ${agent.LatestMarketData?.tvl || 0}, 
        ${agent.LatestMarketData?.price || 0}, 
        ${agent.LatestMarketData?.marketCap || 0}
      )
    `;

    this.logger.log(`Created performance snapshot for agent ${agentId}`);

    // Return the inserted data for API response
    return {
      agentId: agent.id,
      timestamp: new Date(),
      balanceInUSD: pnlData.latestBalance || 0,
      pnl: pnlData.pnl || 0,
      pnlPercentage: pnlData.pnlPercentage || 0,
      pnl24h: agent.LatestMarketData?.pnl24h || 0,
      pnlCycle: agent.LatestMarketData?.pnlCycle || 0,
      tradeCount: agent.LatestMarketData?.tradeCount || 0,
      tvl: agent.LatestMarketData?.tvl || 0,
      price: agent.LatestMarketData?.price || 0,
      marketCap: agent.LatestMarketData?.marketCap || 0,
    };
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
      periodData.count += 1;
      periodData.balanceInUSD += snapshot.balanceInUSD;
      periodData.pnl += snapshot.pnl;
      periodData.pnlPercentage += snapshot.pnlPercentage;
      periodData.pnl24h += snapshot.pnl24h;
      periodData.pnlCycle += snapshot.pnlCycle;
      periodData.tradeCount += snapshot.tradeCount;
      periodData.tvl += snapshot.tvl;
      periodData.price += snapshot.price;
      periodData.marketCap += snapshot.marketCap;
    });

    // Calculate averages and prepare result
    const result = [];
    for (const [data] of aggregateMap.entries()) {
      result.push({
        timestamp: data.period,
        balanceInUSD: data.balanceInUSD / data.count,
        pnl: data.pnl / data.count,
        pnlPercentage: data.pnlPercentage / data.count,
        pnl24h: data.pnl24h / data.count,
        pnlCycle: data.pnlCycle / data.count,
        tradeCount: Math.round(data.tradeCount / data.count),
        tvl: data.tvl / data.count,
        price: data.price / data.count,
        marketCap: data.marketCap / data.count,
        dataPoints: data.count,
      });
    }

    // Sort by timestamp
    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
}
