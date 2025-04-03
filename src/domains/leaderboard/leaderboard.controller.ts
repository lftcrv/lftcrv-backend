import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ElizaAgent } from '../leftcurve-agent/entities/leftcurve-agent.entity';

@ApiTags('Leaderboard')
@Controller('api/leaderboard')
@UseInterceptors(LoggingInterceptor)
export class LeaderboardController {
  constructor(private readonly prisma: PrismaService) {
    // Bind the method to maintain correct 'this' context
    this.formatAgentResponse = this.formatAgentResponse.bind(this);
  }

  private formatAgentResponse(data: any) {
    // Create an ElizaAgent instance to use the profilePictureUrl getter
    const agent = new ElizaAgent({
      ...data.elizaAgent,
      profilePicture: data.elizaAgent.profilePicture,
    });

    return {
      id: data.elizaAgent.id,
      name: data.elizaAgent.name,
      symbol: data.elizaAgent.Token?.symbol,
      type: data.elizaAgent.curveSide === 'LEFT' ? 'leftcurve' : 'rightcurve',
      status: data.bondingStatus.toLowerCase(),
      price: data.price,
      marketCap: data.marketCap,
      holders: data.holders,
      creator: data.elizaAgent.creatorWallet,
      createdAt: data.elizaAgent.createdAt.toISOString(),
      creativityIndex: data.elizaAgent.degenScore || 0,
      performanceIndex: data.elizaAgent.winScore || 0,
      contractAddress: data.elizaAgent.Token?.contractAddress || '',
      profilePicture: data.elizaAgent.profilePicture,
      profilePictureUrl: agent.profilePictureUrl,
      balanceInUSD: data.balanceInUSD || 0,
      pnlCycle: data.pnlCycle || 0,
      pnl24h: data.pnl24h || 0,
      pnlRank: data.pnlRank || 0,
      tradeCount: data.tradeCount || 0,
    };
  }

  @Get('left-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get top agents by degen score (creativity)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Left curve leaderboard retrieved successfully',
  })
  async getLeftCurveLeaderboard(@Query('limit') limit = 5) {
    const take = parseInt(limit.toString(), 10);

    const marketData = await this.prisma.latestMarketData.findMany({
      where: {
        elizaAgent: {
          curveSide: 'LEFT',
        },
      },
      include: {
        elizaAgent: {
          include: {
            Token: true,
          },
        },
      },
      take,
      orderBy: [
        {
          elizaAgent: {
            degenScore: 'desc',
          },
        },
      ],
    });

    const formattedAgents = marketData.map(this.formatAgentResponse);

    return {
      status: 'success',
      data: formattedAgents,
    };
  }

  @Get('right-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get top agents by win score (performance)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Right curve leaderboard retrieved successfully',
  })
  async getRightCurveLeaderboard(@Query('limit') limit = 5) {
    const take = parseInt(limit.toString(), 10);

    const marketData = await this.prisma.latestMarketData.findMany({
      where: {
        elizaAgent: {
          curveSide: 'RIGHT',
        },
      },
      include: {
        elizaAgent: {
          include: {
            Token: true,
          },
        },
      },
      take,
      orderBy: [
        {
          elizaAgent: {
            winScore: 'desc',
          },
        },
      ],
    });

    const formattedAgents = marketData.map(this.formatAgentResponse);

    return {
      status: 'success',
      data: formattedAgents,
    };
  }

  @Get('pnl-leaderboard')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get top agents by PnL performance' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'PnL leaderboard retrieved successfully',
  })
  async getPnlLeaderboard(@Query('limit') limit = 10) {
    const take = parseInt(limit.toString(), 10);

    const marketData = await this.prisma.latestMarketData.findMany({
      where: {
        elizaAgent: {},
      },
      include: {
        elizaAgent: {
          include: {
            Token: true,
          },
        },
      },
      take,
      orderBy: [
        { pnlCycle: 'desc' }, // Order by PnL descending
      ],
    });

    const formattedAgents = marketData.map(this.formatAgentResponse);

    return {
      status: 'success',
      data: formattedAgents,
    };
  }
}
