import {
  Controller,
  Get,
  Post,
  Inject,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AgentTokenTokens, IQueryAgentToken } from './interfaces';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { timestamp } from 'rxjs';

@ApiTags('Agent Token Operations')
@Controller('api/agent-token/:agentId')
@UseInterceptors(LoggingInterceptor)
export class AgentTokenController {
  constructor(
    @Inject(AgentTokenTokens.QueryAgentToken)
    private readonly tokenService: IQueryAgentToken,
    private readonly prisma: PrismaService,
  ) {}

  @Get('bonding-curve-percentage')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get bonding curve percentage' })
  @ApiResponse({
    status: 200,
    description: 'Percentage retrieved successfully',
  })
  async getBondingCurvePercentage(@Param('agentId') agentId: string) {
    const percentage = await this.tokenService.bondingCurvePercentage(agentId);
    return {
      status: 'success',
      data: { percentage },
    };
  }

  @Get('simulate-buy')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get buy simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Buy simulation results' })
  @ApiQuery({
    name: 'tokenAmount',
    description: 'Amount of tokens to simulate',
  })
  async simulateBuy(
    @Param('agentId') agentId: string,
    @Query('tokenAmount')
    tokenAmount: string,
  ) {
    const result = await this.tokenService.simulateBuy(
      agentId,
      BigInt(tokenAmount),
    );
    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }
  @Post('push_current_price')
  @RequireApiKey()
  @ApiOperation({ summary: 'Calcultate and push the price of a token' })
  @ApiResponse({ status: 200, description: 'Currentprice' })
  @ApiQuery({
    name: 'amountEth',
    description: 'Amount of tokens to simulate',
  })
  @ApiQuery({
    name: 'amountToken',
    description: 'Amount of tokens to simulate',
  })
  async pushCurrentPrice(
    @Param('agentId') agentId: string,
    @Query('amountEth') amountEth: number,
    @Query('amountToken') amountToken: number,
  ) {
    const price = await this.tokenService.getCurrentPrice(agentId);
    await this.prisma.priceForToken.create({
      data: {
        tokenId: agentId,
        price: (amountToken / amountEth).toString(),
        timestamp: new Date(),
      },
    });
    // inject on db the current price

    return {
      status: 'success',
      data: { amount: price.toString() },
    };
  }

  @Get('simulate-sell')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get sell simulation for tokens' })
  @ApiResponse({ status: 200, description: 'Sell simulation results' })
  @ApiQuery({
    name: 'tokenAmount',
    description: 'Amount of tokens to simulate',
  })
  async simulateSell(
    @Param('agentId') agentId: string,
    @Query('tokenAmount')
    tokenAmount: string,
  ) {
    const result = await this.tokenService.simulateSell(
      agentId,
      BigInt(tokenAmount),
    );
    return {
      status: 'success',
      data: { amount: result.toString() },
    };
  }
}
