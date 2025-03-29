import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ILatestMarketDataService } from '../interfaces/latest-market-data.interface';
import { LatestMarketData } from 'src/domains/leftcurve-agent/entities/leftcurve-agent.entity';
import { UpdateMarketDataDto } from '../dtos/update-market-data.dto';

@Injectable()
export class ElizaAgentCreateService implements ILatestMarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates market data for an agent, including all the new performance metrics
   * @param agentId ID of the agent to update
   * @param marketData Market data to update
   * @returns The updated market data record
   */
  async updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData> | UpdateMarketDataDto,
  ): Promise<LatestMarketData> {
    return this.prisma.latestMarketData.upsert({
      where: { elizaAgentId: agentId },
      create: {
        elizaAgentId: agentId,
        ...marketData,
      },
      update: marketData,
    });
  }

  /**
   * Updates performance metrics for an agent
   * @param agentId ID of the agent to update
   * @param data Performance metrics to update (pnl, tvl, etc.)
   * @returns The updated market data record
   */
  async updatePerformanceMetrics(
    agentId: string, 
    data: {
      pnlCycle?: number;
      pnl24h?: number;
      tradeCount?: number;
      tvl?: number;
    }
  ): Promise<LatestMarketData> {
    return this.prisma.latestMarketData.update({
      where: { elizaAgentId: agentId },
      data
    });
  }

  /**
   * Increments the fork count for an agent
   * @param agentId ID of the agent that was forked
   * @returns The updated market data record with incremented fork count
   */
  async incrementForkCount(agentId: string): Promise<LatestMarketData> {
    const marketData = await this.prisma.latestMarketData.findUnique({
      where: { elizaAgentId: agentId }
    });
    
    if (!marketData) {
      throw new Error(`Market data not found for agent ${agentId}`);
    }
    
    return this.prisma.latestMarketData.update({
      where: { elizaAgentId: agentId },
      data: { 
        forkCount: marketData.forkCount + 1 
      }
    });
  }
}
