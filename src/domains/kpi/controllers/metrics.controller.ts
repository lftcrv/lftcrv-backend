import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@ApiTags('Metrics')
@Controller('api/metrics')
@UseInterceptors(LoggingInterceptor)
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('agent/:agentId/trades')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get total trade count for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'Trade count retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentTradeCount(@Param('agentId') agentId: string): Promise<any> {
    try {
      const agent = await this.prisma.elizaAgent.findUnique({
        where: { id: agentId },
        include: { LatestMarketData: true },
      });

      if (!agent) {
        throw new NotFoundException(`Agent with ID ${agentId} not found`);
      }

      return {
        agentId: agent.id,
        name: agent.name,
        tradeCount: agent.LatestMarketData?.tradeCount || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to get trade count: ${error.message}`,
      );
    }
  }

  @Get('global/agent-count')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get total number of agents' })
  @ApiResponse({
    status: 200,
    description: 'Agent count retrieved successfully',
  })
  async getTotalAgentCount(): Promise<any> {
    try {
      const count = await this.prisma.elizaAgent.count();

      return {
        totalAgentCount: count,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get agent count: ${error.message}`,
      );
    }
  }

  @Get('global/trades')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get total trade count across all agents' })
  @ApiResponse({
    status: 200,
    description: 'Total trade count retrieved successfully',
  })
  async getTotalTradeCount(): Promise<any> {
    try {
      // Calculate total trade count by summing up tradeCount from all agents
      const result = await this.prisma.latestMarketData.aggregate({
        _sum: {
          tradeCount: true,
        },
      });

      return {
        totalTradeCount: result._sum.tradeCount || 0,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to calculate total trade count: ${error.message}`,
      );
    }
  }

  @Get('global/tvl')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get total TVL across all agents' })
  @ApiResponse({
    status: 200,
    description: 'Total TVL retrieved successfully',
  })
  async getTotalTVL(): Promise<any> {
    try {
      // Calculate total TVL by summing up TVL from all agents
      const result = await this.prisma.latestMarketData.aggregate({
        _sum: {
          tvl: true,
        },
      });

      return {
        totalTVL: result._sum.tvl || 0,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to calculate total TVL: ${error.message}`,
      );
    }
  }

  @Get('global/balances')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get total balance across all agents' })
  @ApiResponse({
    status: 200,
    description: 'Total balance retrieved successfully',
  })
  async getTotalBalance(): Promise<any> {
    try {
      // Use enhanced Prisma service to get calculated balances
      const enhancedClient = this.prisma.getEnhanced();
      const allBalances =
        await enhancedClient.portfolioCalculations.getAllAccountBalancesWithCalculations();

      // Sum up all calculated balances
      const totalBalance = (allBalances as any[]).reduce((sum, balance) => {
        return sum + (Number(balance.calculated_balance_usd) || 0);
      }, 0);

      return {
        totalBalance,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to calculate total balance: ${error.message}`,
      );
    }
  }
}
