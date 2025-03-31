import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';
import { PerformanceSnapshotService } from '../services/performance-snapshot.service';
import { PerformanceHistoryResponseDto } from '../dtos/performance-snapshot.dto';

@ApiTags('Agent Performance')
@Controller('api/performance')
@UseInterceptors(LoggingInterceptor)
export class PerformanceSnapshotController {
  constructor(
    private readonly performanceService: PerformanceSnapshotService,
  ) {}

  @Get(':agentId/history')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get historical performance data for an agent' })
  @ApiResponse({
    status: 200,
    description: 'Performance history retrieved successfully',
    type: PerformanceHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO format)',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['hourly', 'daily', 'weekly'],
    description: 'Data aggregation interval',
  })
  async getAgentPerformanceHistory(
    @Param('agentId') agentId: string,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('interval') interval?: 'hourly' | 'daily' | 'weekly',
  ): Promise<PerformanceHistoryResponseDto> {
    return this.performanceService.getAgentPerformanceHistory(
      agentId,
      fromDate,
      toDate,
      interval || 'daily',
    );
  }

  @Post(':agentId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a performance snapshot for an agent' })
  @ApiResponse({
    status: 201,
    description: 'Performance snapshot created successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async createPerformanceSnapshot(
    @Param('agentId') agentId: string,
  ): Promise<any> {
    return this.performanceService.createAgentPerformanceSnapshot(agentId);
  }
}
