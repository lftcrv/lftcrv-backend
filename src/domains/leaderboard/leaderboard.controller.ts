import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import { ILeaderboardService, LeaderboardTokens } from './interfaces';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

@ApiTags('Leaderboard')
@Controller('api/leaderboard')
@UseInterceptors(LoggingInterceptor)
export class LeaderboardController {
  constructor(
    @Inject(LeaderboardTokens.Service)
    private readonly leaderboardService: ILeaderboardService,
  ) {}

  @Get('left-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get left curve leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Left curve retrieved successfully',
  })
  async getLeftCurveLeaderboard() {
    const leaderboard = await this.leaderboardService.getLeftCurveLeaderboard();
    return {
      status: 'success',
      data: leaderboard,
    };
  }

  @Get('right-curve')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get right curve leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Right curve retrieved successfully',
  })
  async getRightCurveLeaderboard() {
    const leaderboard = this.leaderboardService.getRightCurveLeaderboard();
    return {
      status: 'success',
      data: leaderboard,
    };
  }
}
