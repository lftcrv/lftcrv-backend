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

@ApiTags('Admin Tasks')
@Controller('api/admin/tasks')
@UseInterceptors(LoggingInterceptor)
@RequireApiKey() // Apply API key protection to all routes in this controller
export class AdminTasksController {
  constructor(
    @Inject(TasksService) private readonly tasksService: TasksService,
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
}
