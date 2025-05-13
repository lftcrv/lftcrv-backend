import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggingInterceptor } from '../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../shared/auth/decorators/require-api-key.decorator';
import { MessageService } from './message.service';
import { TradePortfolioRequestDto } from './dtos/trade-portfolio-request.dto';

@ApiTags('Messages')
@Controller('api/messages')
@UseInterceptors(LoggingInterceptor)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('trade-portfolio')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Send trade decision and portfolio allocation requests to an agent',
    description: 'Sends two sequential requests to an agent: first a market analysis and trade decision request, followed by a portfolio allocation request after a specified delay.',
  })
  @ApiResponse({
    status: 201,
    description: 'Requests sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found or not ready',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send the requests',
  })
  async sendTradeAndPortfolioRequests(@Body() dto: TradePortfolioRequestDto) {
    try {
      const result = await this.messageService.sendTradeAndPortfolioRequests(
        dto.runtimeAgentId,
        dto.delayBetweenRequests,
      );
      
      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('not ready')) {
        throw new HttpException(
          `Agent not found or not ready: ${error.message}`,
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        `Failed to send requests: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 