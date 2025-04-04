import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Param,
  UseInterceptors,
  NotFoundException,
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
  async createAccountBalanceData(@Body() dto: AccountBalanceDto): Promise<any> {
    return this.balanceAccountService.createAccountBalanceData(dto);
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

  @Get('portfolio/:runtimeAgentId')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get token portfolio data for a specific agent by runtime ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentPortfolio(
    @Param('runtimeAgentId') runtimeAgentId: string,
  ): Promise<any> {
    return this.balanceAccountService.getAgentPortfolio(runtimeAgentId);
  }

  @Get('agent-portfolio/:agentId')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get token portfolio data for a specific agent by agent ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentPortfolioByAgentId(
    @Param('agentId') agentId: string,
  ): Promise<any> {
    // Get the agent to find its runtimeAgentId
    const agent = await this.balanceAccountService.getAgentById(agentId);
    if (!agent || !agent.runtimeAgentId) {
      throw new NotFoundException(
        `Agent with ID ${agentId} not found or has no runtime ID`,
      );
    }
    return this.balanceAccountService.getAgentPortfolio(agent.runtimeAgentId);
  }

  @Get('balance/:agentId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get balance history for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'Balance history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentBalanceHistory(
    @Param('agentId') agentId: string,
  ): Promise<any> {
    return this.balanceAccountService.getAgentBalanceHistory(agentId);
  }

  @Get('balance/:agentId/current')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get current balance for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'Current balance retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentCurrentBalance(
    @Param('agentId') agentId: string,
  ): Promise<any> {
    return this.balanceAccountService.getAgentCurrentBalance(agentId);
  }
}
