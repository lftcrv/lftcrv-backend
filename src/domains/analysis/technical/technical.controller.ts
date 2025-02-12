import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TechnicalService } from './technical.service';
import { MarketAnalysis, Platform } from './types';
import { MarketAnalysisResponseDTO } from './dto/technical-analysis.dto';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

@ApiTags('Technical Analysis')
@Controller('analysis/technical')
export class TechnicalController {
  constructor(private readonly technicalService: TechnicalService) {}

  @Get()
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get latest technical analysis for specified assets',
    description: 'Analyze one or more cryptocurrencies from Paradex or AVNU',
  })
  @ApiQuery({
    name: 'assets',
    required: true,
    description: 'Comma-separated list of assets to analyze (e.g., "BTC,ETH" for Paradex or "ETH,STRK" for AVNU)',
    type: String,
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Trading platform to use (paradex or avnu)',
    enum: ['paradex', 'avnu'],
    default: 'paradex'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns technical analysis for the requested assets',
    type: MarketAnalysisResponseDTO,
  })
  async getLatestTechnicalAnalysis(
    @Query('assets') assetsQuery: string,
    @Query('platform') platform: Platform = 'paradex',
  ): Promise<{
    status: string;
    data: MarketAnalysis;
  }> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assetsToAnalyze = platform === 'paradex' 
      ? assetsQuery.toUpperCase().split(',')
      : assetsQuery.split(','); 

    const analysis = await this.technicalService.analyzeMarkets(assetsToAnalyze, platform);

    return {
      status: 'success',
      data: analysis,
    };
  }
}