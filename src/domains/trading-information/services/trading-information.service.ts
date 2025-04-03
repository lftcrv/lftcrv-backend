import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ITradingInformation } from '../interfaces/trading-information.interface';
import { TradingInformation } from '../entities/trading-information.entity';
import { TradingInformationDto } from '../dtos/trading-information.dto';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class TradingInformationService implements ITradingInformation {
  private readonly logger = new Logger(TradingInformationService.name);

  constructor(private readonly prisma: PrismaService) {}

  getAllTradingInformation(): Promise<TradingInformation[]> {
    return this.prisma.tradingInformation.findMany();
  }

  async getTradingInformationPerAgent(
    databaseId: string,
  ): Promise<TradingInformation[]> {
    // First verify the agent exists
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: databaseId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent not found with ID: ${databaseId}`);
    }

    const trades = await this.prisma.tradingInformation.findMany({
      where: {
        elizaAgentId: databaseId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format trades to expose the information at the top level
    return trades.map((trade) => {
      // Extract information from nested structure to top level
      if (trade.information) {
        const info = trade.information as any;
        // Use type assertion to handle the extended properties
        return {
          ...trade,
          tradeType: info.tradeType || 'Unknown',
          asset: info.asset || 'Unknown',
          amount: info.amount || 0,
          price: info.price || 0,
          totalCost: info.totalCost || 0,
        } as TradingInformation;
      }
      return trade;
    });
  }

  async getTradingInformation(id: string): Promise<TradingInformation> {
    const trade = await this.prisma.tradingInformation.findUnique({
      where: { id },
    });

    if (!trade) {
      return null;
    }

    // Format trade to expose the information at the top level
    if (trade.information) {
      const info = trade.information as any;
      // Use type assertion to handle the extended properties
      return {
        ...trade,
        tradeType: info.tradeType || 'Unknown',
        asset: info.asset || 'Unknown',
        amount: info.amount || 0,
        price: info.price || 0,
        totalCost: info.totalCost || 0,
      } as TradingInformation;
    }

    return trade;
  }

  async createTradingInformation(
    data: TradingInformationDto,
  ): Promise<TradingInformation> {
    this.logger.log('Creating trading information:', data);

    const agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: {
          startsWith: data.runtimeAgentId,
        },
      },
    });

    if (!agent) {
      // If no agent found with the prefix, try to find it by exact match (fallback)
      const exactAgent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId: data.runtimeAgentId,
        },
      });

      if (!exactAgent) {
        throw new NotFoundException(
          `Agent with runtimeAgentId starting with ${data.runtimeAgentId} not found`,
        );
      }

      // Create the trade information
      const tradeInfo = await this.prisma.tradingInformation.create({
        data: {
          createdAt: new Date(),
          information: data.information,
          elizaAgentId: exactAgent.id,
        },
      });

      // Increment the trade count in LatestMarketData
      await this.updateTradeCount(exactAgent.id);

      return tradeInfo;
    }

    // Create the trade information
    const tradeInfo = await this.prisma.tradingInformation.create({
      data: {
        createdAt: new Date(),
        information: data.information,
        elizaAgentId: agent.id,
      },
    });

    // Increment the trade count in LatestMarketData
    await this.updateTradeCount(agent.id);

    return tradeInfo;
  }

  /**
   * Updates the trade count in the LatestMarketData table
   * @param agentId The ID of the agent
   */
  private async updateTradeCount(agentId: string): Promise<void> {
    try {
      // First check if the LatestMarketData record exists
      const marketData = await this.prisma.latestMarketData.findUnique({
        where: { elizaAgentId: agentId },
      });

      if (marketData) {
        // Increment the trade count
        await this.prisma.latestMarketData.update({
          where: { elizaAgentId: agentId },
          data: {
            tradeCount: marketData.tradeCount + 1,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new LatestMarketData record with trade count 1
        await this.prisma.latestMarketData.create({
          data: {
            elizaAgentId: agentId,
            tradeCount: 1,
            price: 0,
            priceChange24h: 0,
            holders: 0,
            marketCap: 0,
            bondingStatus: 'BONDING',
            forkCount: 0,
            pnlCycle: 0,
            pnl24h: 0,
            tvl: 0,
          },
        });
      }

      this.logger.log(`Updated trade count for agent ${agentId}`);
    } catch (error) {
      this.logger.error(`Error updating trade count: ${error.message}`);
    }
  }
}
