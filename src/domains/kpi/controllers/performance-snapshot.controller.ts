import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';
import { PerformanceSnapshotService } from '../services/performance-snapshot.service';
import { PerformanceHistoryResponseDto } from '../dtos/performance-snapshot.dto';
import { AccountBalanceTokens } from '../interfaces';
import { IAccountBalance } from '../interfaces/kpi.interface';
import { ServiceTokens } from '../../leftcurve-agent/interfaces';
import { IElizaAgentQueryService } from '../../leftcurve-agent/interfaces';

@ApiTags('Agent Performance')
@Controller('api/performance')
@UseInterceptors(LoggingInterceptor)
export class PerformanceSnapshotController {
  constructor(
    private readonly performanceService: PerformanceSnapshotService,
    @Inject(AccountBalanceTokens.AccountBalance)
    private readonly balanceAccountService: IAccountBalance,
    @Inject(ServiceTokens.ElizaAgentQuery)
    private readonly elizaAgentService: IElizaAgentQueryService,
  ) {}

  // Helper method to get agent by id
  private async getAgentById(agentId: string) {
    try {
      return await this.elizaAgentService.getAgent(agentId);
    } catch (error) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }
  }

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

  @Get(':agentId/assets')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get asset allocation for an agent' })
  @ApiResponse({
    status: 200,
    description: 'Asset allocation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentAssetAllocation(
    @Param('agentId') agentId: string,
  ): Promise<any> {
    // First try to find agent by ID, then by runtimeAgentId if needed
    try {
      // Get the agent to find its runtimeAgentId
      const agent = await this.getAgentById(agentId);

      // Get the portfolio data using the runtimeAgentId
      const portfolioData = await this.balanceAccountService.getAgentPortfolio(
        agent.runtimeAgentId,
      );

      // Format the data as expected by frontend
      return {
        status: 'success',
        data: {
          timestamp: portfolioData.timestamp,
          totalBalance: portfolioData.balanceInUSD,
          assets: portfolioData.portfolio.map((token) => ({
            symbol: token.symbol,
            allocation: token.percentage / 100, // Convert percentage to decimal
            balance: token.balance,
            price: token.price,
            valueUsd: token.valueUsd,
          })),
        },
      };
    } catch (error) {
      // If the first attempt fails, try directly with the provided ID
      const portfolioData =
        await this.balanceAccountService.getAgentPortfolio(agentId);

      return {
        status: 'success',
        data: {
          timestamp: portfolioData.timestamp,
          totalBalance: portfolioData.balanceInUSD,
          assets: portfolioData.portfolio.map((token) => ({
            symbol: token.symbol,
            allocation: token.percentage / 100, // Convert percentage to decimal
            balance: token.balance,
            price: token.price,
            valueUsd: token.valueUsd,
          })),
        },
      };
    }
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
