import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ICreatorsService } from '../interfaces';
import {
  PageQueryDto,
  PaginatedResponseDto,
  CreatorDto,
  AgentSummaryDto,
  CreatorPerformanceAgentDetailDto,
  CreatorPerformanceSummaryDto,
  LeaderboardQueryDto,
  LeaderboardSortField,
  CreatorLeaderboardEntryDto,
} from '../dtos';
import { AgentStatus, LatestMarketData } from '@prisma/client';

@Injectable()
export class CreatorsService implements ICreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllCreators(
    query: PageQueryDto,
  ): Promise<PaginatedResponseDto<CreatorDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // Get creators with count of agents
    const creatorsWithCount = await this.prisma.elizaAgent.groupBy({
      by: ['creatorWallet'],
      _count: {
        id: true,
      },
      skip,
      take,
      orderBy: {
        creatorWallet: 'asc', // Required for pagination to work with groupBy
      },
    });

    // Get total count of unique creators
    const totalCreatorsCount = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT "creatorWallet" FROM "eliza_agents"
        GROUP BY "creatorWallet"
      ) as creators
    `;

    const total = Number(totalCreatorsCount[0]?.count || 0);

    // Map to CreatorDto
    const creators = creatorsWithCount.map((creator) => ({
      creatorId: creator.creatorWallet,
      agentCount: creator._count.id,
    }));

    const response = new PaginatedResponseDto<CreatorDto>();
    response.data = creators;
    response.total = total;
    response.page = page;
    response.limit = limit;

    return response;
  }

  async findCreatorById(creatorId: string): Promise<CreatorDto> {
    const agentCount = await this.prisma.elizaAgent.count({
      where: {
        creatorWallet: creatorId,
      },
    });

    if (agentCount === 0) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    return {
      creatorId,
      agentCount,
    };
  }

  async findAgentsByCreatorId(
    creatorId: string,
    query: PageQueryDto,
  ): Promise<PaginatedResponseDto<AgentSummaryDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // First verify creator exists
    const creatorExists = await this.prisma.elizaAgent.findFirst({
      where: {
        creatorWallet: creatorId,
      },
      select: {
        creatorWallet: true,
      },
    });

    if (!creatorExists) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    // Get agents for creator with pagination
    const agents = await this.prisma.elizaAgent.findMany({
      where: {
        creatorWallet: creatorId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    // Get total count of agents for this creator
    const total = await this.prisma.elizaAgent.count({
      where: {
        creatorWallet: creatorId,
      },
    });

    const response = new PaginatedResponseDto<AgentSummaryDto>();
    response.data = agents;
    response.total = total;
    response.page = page;
    response.limit = limit;

    return response;
  }

  async getCreatorPerformance(
    creatorId: string,
  ): Promise<CreatorPerformanceSummaryDto> {
    // 1. Fetch agents with latest market data
    const agentsWithData = await this.prisma.elizaAgent.findMany({
      where: {
        creatorWallet: creatorId,
      },
      include: {
        LatestMarketData: true, // Eager load latest data
      },
    });

    // 2. Handle not found case
    if (agentsWithData.length === 0) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    // 3. Initialize aggregators
    let aggregators = {
      totalTvl: 0,
      totalBalanceInUSD: 0,
      totalPnlCycle: 0,
      totalPnl24h: 0,
      totalTradeCount: 0,
    };
    let runningAgents = 0;
    let bestAgentPnlCycle = -Infinity;
    let bestAgentDto: CreatorPerformanceAgentDetailDto | null = null;
    let latestUpdateTimestamp: Date | null = null;

    // 4. Process agents
    const agentDetails: CreatorPerformanceAgentDetailDto[] = [];

    for (const agent of agentsWithData) {
      // Create agent detail DTO
      const agentDetailDto = new CreatorPerformanceAgentDetailDto();
      agentDetailDto.id = agent.id;
      agentDetailDto.name = agent.name;
      agentDetailDto.status = agent.status;
      agentDetailDto.profilePicture = agent.profilePicture || undefined;
      agentDetailDto.createdAt = agent.createdAt;

      // Check if agent has market data
      if (agent.LatestMarketData) {
        const marketData = agent.LatestMarketData;

        // Map LatestMarketData fields
        agentDetailDto.balanceInUSD = marketData.balanceInUSD;
        agentDetailDto.tvl = marketData.tvl;
        agentDetailDto.pnlCycle = marketData.pnlCycle;
        agentDetailDto.pnl24h = marketData.pnl24h;
        agentDetailDto.tradeCount = marketData.tradeCount;
        agentDetailDto.marketCap = marketData.marketCap;

        // Update aggregators using helper method
        aggregators = this._updateAggregators(aggregators, marketData);

        // Update best performing agent based on pnlCycle
        if ((marketData.pnlCycle ?? -Infinity) > bestAgentPnlCycle) {
          bestAgentPnlCycle = marketData.pnlCycle ?? -Infinity;
          bestAgentDto = agentDetailDto; // Store the DTO itself
        }

        // Update latest timestamp
        if (
          marketData.updatedAt &&
          (!latestUpdateTimestamp ||
            marketData.updatedAt > latestUpdateTimestamp)
        ) {
          latestUpdateTimestamp = marketData.updatedAt;
        }
      } else {
        // Set defaults for agents without market data
        agentDetailDto.balanceInUSD = null;
        agentDetailDto.tvl = null;
        agentDetailDto.pnlCycle = null;
        agentDetailDto.pnl24h = null;
        agentDetailDto.tradeCount = null;
        agentDetailDto.marketCap = null;
      }

      // Count running agents
      if (agent.status === AgentStatus.RUNNING) {
        runningAgents++;
      }

      // Add to agent details array
      agentDetails.push(agentDetailDto);
    }

    // 5. Construct response
    const response = new CreatorPerformanceSummaryDto();
    response.creatorId = creatorId;
    response.totalAgents = agentsWithData.length;
    response.runningAgents = runningAgents;
    response.totalTvl = aggregators.totalTvl;
    response.totalBalanceInUSD = aggregators.totalBalanceInUSD;
    response.totalPnlCycle = aggregators.totalPnlCycle;
    response.totalPnl24h = aggregators.totalPnl24h;
    response.totalTradeCount = aggregators.totalTradeCount;
    response.bestPerformingAgentPnlCycle =
      bestAgentPnlCycle > -Infinity ? bestAgentDto : null;
    response.agentDetails = agentDetails;
    response.lastUpdated = latestUpdateTimestamp;

    return response;
  }

  /**
   * Private helper to update aggregate performance metrics.
   */
  private _updateAggregators(
    currentAggregates: {
      totalTvl: number;
      totalBalanceInUSD: number;
      totalPnlCycle: number;
      totalPnl24h: number;
      totalTradeCount: number;
    },
    marketData: LatestMarketData,
  ): {
    totalTvl: number;
    totalBalanceInUSD: number;
    totalPnlCycle: number;
    totalPnl24h: number;
    totalTradeCount: number;
  } {
    return {
      totalTvl: currentAggregates.totalTvl + (marketData.tvl ?? 0),
      totalBalanceInUSD:
        currentAggregates.totalBalanceInUSD + (marketData.balanceInUSD ?? 0),
      totalPnlCycle:
        currentAggregates.totalPnlCycle + (marketData.pnlCycle ?? 0),
      totalPnl24h: currentAggregates.totalPnl24h + (marketData.pnl24h ?? 0),
      totalTradeCount:
        currentAggregates.totalTradeCount + (marketData.tradeCount ?? 0),
    };
  }

  async getCreatorLeaderboard(
    query: LeaderboardQueryDto,
  ): Promise<PaginatedResponseDto<CreatorLeaderboardEntryDto>> {
    const { page, limit, sortBy } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // Determine sort order and field based on the query parameter
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    switch (sortBy) {
      case LeaderboardSortField.BALANCE:
        orderBy.totalBalanceInUSD = 'desc';
        break;
      case LeaderboardSortField.PNL_CYCLE:
        orderBy.aggregatedPnlCycle = 'desc';
        break;
      case LeaderboardSortField.PNL_24H:
        orderBy.aggregatedPnl24h = 'desc';
        break;
      case LeaderboardSortField.RUNNING_AGENTS:
        orderBy.runningAgents = 'desc';
        break;
      default:
        orderBy.aggregatedPnlCycle = 'desc'; // Default sort
    }

    // Get leaderboard entries with pagination
    // Using type assertion to handle potential Prisma client typing issues
    const prismaAny = this.prisma as any;
    const leaderboardEntries = await prismaAny.creatorLeaderboardData.findMany({
      skip,
      take,
      orderBy,
    });

    // Get total count
    const total = await prismaAny.creatorLeaderboardData.count();

    // Map to DTOs
    const leaderboardDtos = leaderboardEntries.map((entry) => ({
      creatorId: entry.creatorWallet,
      totalAgents: entry.totalAgents,
      runningAgents: entry.runningAgents,
      totalBalanceInUSD: entry.totalBalanceInUSD,
      aggregatedPnlCycle: entry.aggregatedPnlCycle,
      aggregatedPnl24h: entry.aggregatedPnl24h,
      bestAgentId: entry.bestAgentId || undefined,
      bestAgentPnlCycle: entry.bestAgentPnlCycle || undefined,
      updatedAt: entry.updatedAt,
    }));

    // Create paginated response
    const response = new PaginatedResponseDto<CreatorLeaderboardEntryDto>();
    response.data = leaderboardDtos;
    response.total = total;
    response.page = page;
    response.limit = limit;

    return response;
  }

  async calculateAndStoreLeaderboard(): Promise<void> {
    this.logger.log('Starting leaderboard calculation for all creators');
    const startTime = Date.now();

    try {
      // 1. Get all unique creator wallets
      const uniqueCreators = await this.prisma.elizaAgent.groupBy({
        by: ['creatorWallet'],
      });

      this.logger.debug(`Processing ${uniqueCreators.length} unique creators`);

      // 2. Process each creator
      for (const creator of uniqueCreators) {
        const creatorWallet = creator.creatorWallet;

        // For each creator, fetch all their agents with latest market data
        const agentsWithData = await this.prisma.elizaAgent.findMany({
          where: {
            creatorWallet,
          },
          include: {
            LatestMarketData: true,
          },
        });

        // Initialize aggregators
        const totalAgents = agentsWithData.length;
        let runningAgents = 0;
        let totalBalanceInUSD = 0;
        let aggregatedPnlCycle = 0;
        let aggregatedPnl24h = 0;
        let bestAgentId: string | null = null;
        let bestAgentPnlCycle = -Infinity;

        // Process each agent
        for (const agent of agentsWithData) {
          // Count running agents
          if (agent.status === AgentStatus.RUNNING) {
            runningAgents++;
          }

          // Process market data if available
          if (agent.LatestMarketData) {
            const marketData = agent.LatestMarketData;

            // Aggregate values
            totalBalanceInUSD += marketData.balanceInUSD || 0;
            aggregatedPnlCycle += marketData.pnlCycle || 0;
            aggregatedPnl24h += marketData.pnl24h || 0;

            // Update best agent if this one has better PnL cycle
            if ((marketData.pnlCycle || -Infinity) > bestAgentPnlCycle) {
              bestAgentPnlCycle = marketData.pnlCycle || -Infinity;
              bestAgentId = agent.id;
            }
          }
        }

        // Update or create leaderboard entry using type assertion
        const prismaAny = this.prisma as any;
        await prismaAny.creatorLeaderboardData.upsert({
          where: {
            creatorWallet,
          },
          update: {
            totalAgents,
            runningAgents,
            totalBalanceInUSD,
            aggregatedPnlCycle,
            aggregatedPnl24h,
            bestAgentId,
            bestAgentPnlCycle:
              bestAgentPnlCycle !== -Infinity ? bestAgentPnlCycle : null,
          },
          create: {
            creatorWallet,
            totalAgents,
            runningAgents,
            totalBalanceInUSD,
            aggregatedPnlCycle,
            aggregatedPnl24h,
            bestAgentId,
            bestAgentPnlCycle:
              bestAgentPnlCycle !== -Infinity ? bestAgentPnlCycle : null,
          },
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed leaderboard calculation and storage in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to calculate leaderboard (${duration}ms): ${error.message}`,
      );
      throw error;
    }
  }
}
