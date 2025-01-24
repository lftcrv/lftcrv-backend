import {
  Controller,
  Get,
  Inject,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentTokenTokens, IQueryAgentToken } from './interfaces';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';
import { AgentTokenSimulationDto } from './dto/agent-token-simulation.dto';

@ApiTags('Agent Token Operations')
@Controller('api/agent-token')
@UseInterceptors(LoggingInterceptor)
export class AgentTokenController {
  constructor(
    @Inject(AgentTokenTokens.QueryAgentToken)
    private readonly tokenService: IQueryAgentToken,
  ) {}

  @Get('simulate-buy')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get buy simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Buy simulation results' })
  async simulateBuy(@Query() query: AgentTokenSimulationDto) {
    const result = await this.tokenService.simulateBuy(
      query.agentId,
      BigInt(query.tokenAmount),
    );

    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }

  @Get('simulate-sell')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get sell simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Sell simulation results' })
  async simulateSell(@Query() query: AgentTokenSimulationDto) {
    const result = await this.tokenService.simulateSell(
      query.agentId,
      BigInt(query.tokenAmount),
    );

    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }
}
