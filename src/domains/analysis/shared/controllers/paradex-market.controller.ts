import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ParadexMarketsService } from '../services/paradex-markets.service';
import {
  ParadexMarketsResponseDto,
  ParadexSymbolsResponseDto,
  RefreshMarketsResponseDto,
} from '../dto/paradex-market.dto';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

@ApiTags('Paradex Markets')
@Controller('markets/paradex')
export class ParadexMarketsController {
  constructor(private readonly paradexMarketsService: ParadexMarketsService) {}

  @Post('refresh')
  @RequireApiKey()
  @ApiOperation({ summary: 'Fetch and update markets from Paradex' })
  @ApiResponse({
    status: 200,
    description: 'Markets successfully updated',
    type: RefreshMarketsResponseDto,
  })
  async refreshMarkets(): Promise<RefreshMarketsResponseDto> {
    await this.paradexMarketsService.fetchAndUpdateMarkets();
    return { message: 'Markets updated successfully' };
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all active Paradex markets' })
  @ApiResponse({
    status: 200,
    description: 'Returns all active markets',
    type: ParadexMarketsResponseDto,
  })
  async getAllMarkets(): Promise<ParadexMarketsResponseDto> {
    const markets = await this.paradexMarketsService.getAllMarkets();
    return {
      count: markets.length,
      markets,
    };
  }

  @Get('symbols')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all active Paradex market symbols' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of market symbols',
    type: ParadexSymbolsResponseDto,
  })
  async getSymbols(): Promise<ParadexSymbolsResponseDto> {
    const symbols = await this.paradexMarketsService.getAllSymbols();
    return {
      count: symbols.length,
      symbols,
    };
  }
}
