import {
  Controller,
  Post,
  UseInterceptors,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { TasksService } from '../../cron/tasks.service';
import { SyncPerformanceMetricsTask } from '../../cron/tasks/sync-performance-metrics.task';

@ApiTags('Admin Tasks')
@Controller('api/admin/tasks')
@UseInterceptors(LoggingInterceptor)
@RequireApiKey() // Apply API key protection to all routes in this controller
export class AdminTasksController {
  constructor(
    @Inject(TasksService) private readonly tasksService: TasksService,
    private readonly syncPerformanceMetricsTask: SyncPerformanceMetricsTask,
  ) {}

  @Post('trigger-leaderboard-update')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger the creator leaderboard update' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Creator leaderboard update task has been initiated.',
  })
  async triggerLeaderboardUpdate(): Promise<{ message: string }> {
    // Intentionally not awaiting to allow the HTTP request to return quickly
    this.tasksService.updateCreatorLeaderboard().catch((error) => {
      // Log the error appropriately if the task fails in the background
      console.error('Error during background leaderboard update:', error);
      // Depending on your setup, you might use a more sophisticated logger
    });
    return {
      message: 'Creator leaderboard update task has been initiated.',
    };
  }

  @Post('trigger-performance-cleanup')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger the performance data cleanup' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Performance data cleanup task has been initiated.',
  })
  async triggerPerformanceCleanup(): Promise<{ message: string }> {
    // Intentionally not awaiting
    this.tasksService.cleanupPerformanceData().catch((error) => {
      console.error('Error during background performance data cleanup:', error);
    });
    return { message: 'Performance data cleanup task has been initiated.' };
  }

  @Post('trigger-performance-snapshots')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Manually trigger agent performance snapshot updates',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Agent performance snapshot update task has been initiated.',
  })
  async triggerPerformanceSnapshots(): Promise<{ message: string }> {
    this.tasksService.updateAgentPerformanceSnapshots().catch((error) => {
      console.error(
        'Error during background performance snapshots update:',
        error,
      );
    });
    return {
      message: 'Agent performance snapshot update task has been initiated.',
    };
  }

  @Post('trigger-performance-metrics-sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Manually trigger performance metrics synchronization',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Performance metrics sync task has been initiated.',
  })
  async triggerPerformanceMetricsSync(): Promise<{ message: string }> {
    this.syncPerformanceMetricsTask.execute().catch((error) => {
      console.error('Error during background performance metrics sync:', error);
    });
    return { message: 'Performance metrics sync task has been initiated.' };
  }

  @Post('trigger-token-price-sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually trigger token price synchronization' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Token price sync task has been initiated.',
  })
  async triggerTokenPriceSync(): Promise<{ message: string }> {
    this.tasksService.syncTokenPrices().catch((error) => {
      console.error('Error during background token price sync:', error);
    });
    return { message: 'Token price sync task has been initiated.' };
  }

  @Post('trigger-paradex-analysis')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Manually trigger Paradex market analysis generation',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Paradex analysis generation task has been initiated.',
  })
  async triggerParadexAnalysis(): Promise<{ message: string }> {
    this.tasksService.generateParadexAnalysis().catch((error) => {
      console.error(
        'Error during background Paradex analysis generation:',
        error,
      );
    });
    return { message: 'Paradex analysis generation task has been initiated.' };
  }

  @Post('trigger-trade-simulation')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Manually trigger trade simulation messages to agents',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Trade simulation task has been initiated.',
  })
  async triggerTradeSimulation(): Promise<{ message: string }> {
    this.tasksService.sendTradeSimulation().catch((error) => {
      console.error('Error during background trade simulation:', error);
    });
    return { message: 'Trade simulation task has been initiated.' };
  }

  @Post('trigger-portfolio-balance-update')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Manually trigger portfolio balance update requests to agents',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Portfolio balance update task has been initiated.',
  })
  async triggerPortfolioBalanceUpdate(): Promise<{ message: string }> {
    this.tasksService.sendPortfolioBalanceUpdate().catch((error) => {
      console.error('Error during background portfolio balance update:', error);
    });
    return { message: 'Portfolio balance update task has been initiated.' };
  }

  @Post('trigger-all-performance-updates')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Manually trigger all performance-related updates (metrics sync + snapshots + leaderboard)',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'All performance update tasks have been initiated.',
  })
  async triggerAllPerformanceUpdates(): Promise<{ message: string }> {
    // Run all performance-related tasks in sequence
    this.syncPerformanceMetricsTask
      .execute()
      .then(() => this.tasksService.updateAgentPerformanceSnapshots())
      .then(() => this.tasksService.updateCreatorLeaderboard())
      .catch((error) => {
        console.error('Error during background performance updates:', error);
      });
    return { message: 'All performance update tasks have been initiated.' };
  }

  @Post('trigger-full-system-sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Manually trigger complete system synchronization (prices + performance + leaderboards)',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Full system sync has been initiated.',
  })
  async triggerFullSystemSync(): Promise<{ message: string }> {
    // Run all sync tasks in optimal order
    this.tasksService
      .syncTokenPrices()
      .then(() => this.syncPerformanceMetricsTask.execute())
      .then(() => this.tasksService.updateAgentPerformanceSnapshots())
      .then(() => this.tasksService.updateCreatorLeaderboard())
      .catch((error) => {
        console.error('Error during background full system sync:', error);
      });
    return { message: 'Full system synchronization has been initiated.' };
  }
}
