import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TechnicalService } from './technical.service';
import { MarketAnalysis } from './types';
import { MarketAnalysisResponseDTO } from './dto/technical-analysis.dto';

@ApiTags('Technical Analysis')
@Controller('analysis/technical')
export class TechnicalController {
  constructor(private readonly technicalService: TechnicalService) {}

  @Get()
  @ApiOperation({
    summary: 'Get latest technical analysis for specified assets',
    description: 'Analyze one or more cryptocurrencies',
  })
  @ApiQuery({
    name: 'assets',
    required: true,
    description: 'Comma-separated list of assets to analyze (e.g., "BTC,ETH")',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns technical analysis for the requested assets',
    type: MarketAnalysisResponseDTO,
  })
  async getLatestTechnicalAnalysis(
    @Query('assets') assetsQuery: string,
  ): Promise<{
    status: string;
    data: MarketAnalysis;
  }> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assetsToAnalyze = assetsQuery.toUpperCase().split(',');
    const analysis =
      await this.technicalService.analyzeMarkets(assetsToAnalyze);

    return {
      status: 'success',
      data: analysis,
    };
  }
}
