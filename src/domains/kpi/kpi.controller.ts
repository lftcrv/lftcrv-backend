import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { AccountBalanceDto } from './dtos/kpi.dto';
import { AccountBalanceTokens, IAccountBalance } from './interfaces';

@ApiTags('KPIs')
@Controller('api/kpi')
@UseInterceptors(LoggingInterceptor)
export class KPIController {
  constructor(
    @Inject(AccountBalanceTokens.AccountBalance)
    private readonly balanceAccountService: IAccountBalance,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create new balance account data for an agent' })
  @ApiResponse({
    status: 201,
    description: 'Balance account data created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid information provided' })
  async createAccountBalanceData(
    @Body() dto: AccountBalanceDto,
  ): Promise<any> {
    return this.balanceAccountService.createAccountBalanceData({
      runtimeAgentId: dto.runtimeAgentId,
      balanceInUSD: dto.balanceInUSD,
    });
  }

  @Get('pnl/:runtimeAgentId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get PnL (Profit and Loss) for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'PnL retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentPnL(
    @Param('runtimeAgentId') runtimeAgentId: string,
  ): Promise<any> {
    return this.balanceAccountService.getAgentPnL(runtimeAgentId);
  }
  
  @Get('pnl')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get PnL (Profit and Loss) for all agents' })
  @ApiResponse({
    status: 200,
    description: 'PnL for all agents retrieved successfully',
  })
  async getAllAgentsPnL(): Promise<any[]> {
    return this.balanceAccountService.getAllAgentsPnL();
  }
  
  @Get('pnl/best')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get the agent with the best PnL performance' })
  @ApiResponse({
    status: 200,
    description: 'Best performing agent retrieved successfully',
  })
  async getBestPerformingAgent(): Promise<any> {
    return this.balanceAccountService.getBestPerformingAgent();
  }
}