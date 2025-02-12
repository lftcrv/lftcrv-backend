import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Leaderboard')
@Controller('api/leaderboard')
@UseInterceptors(LoggingInterceptor)
export class LeaderboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('left-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get left curve leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Left curve leaderboard retrieved successfully',
  })
  async getLeftCurveLeaderboard(@Query('limit') limit = 5) {
    const agents = await this.prisma.elizaAgent.findMany({
      where: {
        curveSide: 'LEFT',
        Token: { isNot: null },
      },
      include: {
        Token: true,
        LatestMarketData: true,
      },
      take: limit,
      orderBy: {
        degenScore: 'desc',
      },
    });

    const formattedAgents = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      symbol: agent.Token?.symbol,
      type: 'leftcurve',
      status: agent.LatestMarketData?.bondingStatus.toLowerCase() || 'bonding',
      price: agent.LatestMarketData?.price || 0,
      marketCap: agent.LatestMarketData?.marketCap || 0,
      holders: agent.LatestMarketData?.holders || 0,
      creator: agent.creatorWallet,
      createdAt: agent.createdAt.toISOString(),
      creativityIndex: agent.degenScore || 0,
      performanceIndex: agent.winScore || 0,
      contractAddress: agent.Token?.contractAddress || '',
    }));

    return {
      status: 'success',
      data: formattedAgents,
    };
  }

  @Get('right-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get right curve leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Right curve leaderboard retrieved successfully',
  })
  async getRightCurveLeaderboard(@Query('limit') limit = 5) {
    const agents = await this.prisma.elizaAgent.findMany({
      where: {
        curveSide: 'RIGHT',
        Token: { isNot: null },
      },
      include: {
        Token: true,
        LatestMarketData: true,
      },
      take: limit,
      orderBy: {
        winScore: 'desc',
      },
    });

    const formattedAgents = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      symbol: agent.Token?.symbol,
      type: 'rightcurve',
      status: agent.LatestMarketData?.bondingStatus.toLowerCase() || 'bonding',
      price: agent.LatestMarketData?.price || 0,
      marketCap: agent.LatestMarketData?.marketCap || 0,
      holders: agent.LatestMarketData?.holders || 0,
      creator: agent.creatorWallet,
      createdAt: agent.createdAt.toISOString(),
      creativityIndex: agent.degenScore || 0,
      performanceIndex: agent.winScore || 0,
      contractAddress: agent.Token?.contractAddress || '',
    }));

    return {
      status: 'success',
      data: formattedAgents,
    };
  }
}
