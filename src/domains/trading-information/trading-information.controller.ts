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
import { ITradingInformation, TradingInformationTokens } from './interfaces';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { TradingInformation } from './entities/trading-information.entity';
import { TradingInformationDto } from './dtos/trading-information.dto';

@ApiTags('Trading information')
@Controller('api/trading-information')
@UseInterceptors(LoggingInterceptor)
export class TradingInformationController {
  constructor(
    @Inject(TradingInformationTokens.TradingInformation)
    private readonly tradingInformationService: ITradingInformation,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create new trading information for an agent' })
  @ApiResponse({
    status: 201,
    description: 'Trading information created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid information provided' })
  async createTradingInformation(
    @Body() dto: TradingInformationDto,
  ): Promise<TradingInformation> {
    return this.tradingInformationService.createTradingInformation({
      runtimeAgentId: dto.runtimeAgentId,
      information: dto.information,
    });
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'List all trading information' })
  @ApiResponse({
    status: 200,
    description: 'List of trading information retrieved successfully',
  })
  async getAllTradingInformation(): Promise<{
    status: string;
    data: { trades: TradingInformation[] };
  }> {
    const trades =
      await this.tradingInformationService.getAllTradingInformation();

    const formattedTrades = trades.map((trade) => ({
      ...trade,
      createdAt:
        trade.createdAt instanceof Date
          ? trade.createdAt.toISOString()
          : trade.createdAt,
    }));

    return {
      status: 'success',
      data: { trades: formattedTrades },
    };
  }

  @Get('agent/:agentId')
  @RequireApiKey()
  @ApiOperation({ summary: 'List trading information for a specific agent' })
  @ApiResponse({
    status: 200,
    description: 'List of trading information retrieved successfully',
  })
  async getTradingInformationPerAgent(
    @Param('agentId') agentId: string,
  ): Promise<{
    status: string;
    data: { trades: TradingInformation[] };
  }> {
    const trades =
      await this.tradingInformationService.getTradingInformationPerAgent(
        agentId,
      );

    const formattedTrades = trades.map((trade) => ({
      ...trade,
      createdAt:
        trade.createdAt instanceof Date
          ? trade.createdAt.toISOString()
          : trade.createdAt,
    }));

    return {
      status: 'success',
      data: { trades: formattedTrades },
    };
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a specific trading information by ID' })
  @ApiResponse({
    status: 200,
    description: 'Trading information retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Trading information not found' })
  async getTradingInformation(@Param('id') id: string): Promise<{
    status: string;
    data: { trade: TradingInformation };
  }> {
    const trade =
      await this.tradingInformationService.getTradingInformation(id);

    const formattedTrade = trade
      ? {
          ...trade,
          createdAt:
            trade.createdAt instanceof Date
              ? trade.createdAt.toISOString()
              : trade.createdAt,
        }
      : null;

    return {
      status: 'success',
      data: { trade: formattedTrade },
    };
  }
}
