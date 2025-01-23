import {
  Body,
  Controller,
  Inject,
  InternalServerErrorException,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { AgentTokenTokens, IManageAgentToken } from './interfaces';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';
import { TokenOperationDto } from './dto/agent-token-management.dto';

@ApiTags('Agent Token Operations')
@Controller('api/agent-token')
@UseInterceptors(LoggingInterceptor)
export class AgentTokenController {
  constructor(
    @Inject(AgentTokenTokens.ManageAgentToken)
    private readonly tokenService: IManageAgentToken,
  ) {}

  @Post('buy')
  @RequireApiKey()
  @ApiOperation({ summary: 'Buy tokens for an agent' })
  @ApiResponse({ status: 200, description: 'Tokens bought successfully' })
  async buyTokens(@Body() dto: TokenOperationDto) {
    try {
      const result = await this.tokenService.buy(
        dto.agentId,
        BigInt(dto.tokenAmount),
      );
      return {
        status: 'success',
        data: { amount: result.toString() },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to buy tokens: ${error.message}`,
      );
    }
  }

  @Post('sell')
  @RequireApiKey()
  @ApiOperation({ summary: 'Sell tokens for an agent' })
  @ApiResponse({ status: 200, description: 'Tokens sold successfully' })
  async sellTokens(@Body() dto: TokenOperationDto) {
    try {
      const result = await this.tokenService.sell(
        dto.agentId,
        BigInt(dto.tokenAmount),
      );
      return {
        status: 'success',
        data: { amount: result.toString() },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to sell tokens: ${error.message}`,
      );
    }
  }

  @Post('simulate/buy')
  @RequireApiKey()
  @ApiOperation({ summary: 'Simulate buying tokens for an agent' })
  @ApiResponse({ status: 200, description: 'Buy simulation completed' })
  async simulateBuy(@Body() dto: TokenOperationDto) {
    try {
      const result = await this.tokenService.simulateBuy(
        dto.agentId,
        BigInt(dto.tokenAmount),
      );
      return {
        status: 'success',
        data: { estimatedAmount: result.toString() },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to simulate buy: ${error.message}`,
      );
    }
  }

  @Post('simulate/sell')
  @RequireApiKey()
  @ApiOperation({ summary: 'Simulate selling tokens for an agent' })
  @ApiResponse({ status: 200, description: 'Sell simulation completed' })
  async simulateSell(@Body() dto: TokenOperationDto) {
    try {
      const result = await this.tokenService.simulateSell(
        dto.agentId,
        BigInt(dto.tokenAmount),
      );
      return {
        status: 'success',
        data: { estimatedAmount: result.toString() },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to simulate sell: ${error.message}`,
      );
    }
  }
}
