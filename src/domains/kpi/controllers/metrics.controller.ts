import {
  Controller,
  Get,
  UseInterceptors,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Type extension for PrismaService to handle models not in schema
interface ExtendedPrismaModels {
  paradexAccountBalance: {
    findFirst: any;
    findMany: any;
  };
}

// Extended PrismaService with additional models
type ExtendedPrismaService = PrismaService & ExtendedPrismaModels;

@ApiTags('Metrics')
@Controller('api/metrics')
@UseInterceptors(LoggingInterceptor)
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

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
      // For each agent, get their latest balance
      const agents = await this.prisma.elizaAgent.findMany();
      let totalBalance = 0;

      const extendedPrisma = this.prisma as ExtendedPrismaService;

      for (const agent of agents) {
        const latestBalance =
          await extendedPrisma.paradexAccountBalance.findFirst({
            where: { agentId: agent.id },
            orderBy: { createdAt: 'desc' },
          });

        if (latestBalance) {
          totalBalance += latestBalance.balanceInUSD;
        }
      }

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
