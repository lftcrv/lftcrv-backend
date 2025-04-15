import {
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CombinedAssetAnalysis, BatchAnalysisResult } from './analysis.types';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';
import { Platform } from './technical/types';

@ApiTags('Market Analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('generate')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Generate and store analysis for multiple assets',
    description:
      'Generates and stores combined technical and social analysis for specified assets',
  })
  @ApiQuery({
    name: 'assets',
    required: true,
    description:
      'Comma-separated list of assets to analyze (e.g., "BTC,ETH" for Paradex, "ETH,STRK" for AVNU)',
    type: String,
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Trading platform to use (paradex or avnu)',
    enum: ['paradex', 'avnu'],
    default: 'paradex',
  })
  async generateAnalysis(
    @Query('assets') assetsQuery: string,
    @Query('platform') platform: Platform = 'paradex',
  ): Promise<BatchAnalysisResult> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assets = assetsQuery.split(',');
    return this.analysisService.analyzeMultipleAssets(assets, platform);
  }

  @Get('latest')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get latest analysis for multiple assets',
    description: 'Retrieves the most recent analysis for specified assets',
  })
  @ApiQuery({
    name: 'assets',
    required: true,
    description:
      'Comma-separated list of assets to get analysis for (e.g., "BTC,ETH" for Paradex, "ETH,STRK" for AVNU)',
    type: String,
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Trading platform to use (paradex or avnu)',
    enum: ['paradex', 'avnu'],
    default: 'paradex',
  })
  async getLatestAnalysis(
    @Query('assets') assetsQuery: string,
    @Query('platform') platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis[]> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assets = assetsQuery.split(',');
    return this.analysisService.getLatestAnalyses(assets, platform);
  }

  @Get('agent/:runtimeAgentId')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get latest analysis for an agent',
    description:
      'Retrieves the most recent analysis for cryptos selected by the agent',
  })
  @ApiParam({
    name: 'runtimeAgentId',
    required: true,
    description: 'Runtime ID of the agent',
    type: String,
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Trading platform to use (paradex or avnu)',
    enum: ['paradex', 'avnu'],
    default: 'paradex',
  })
  async getLatestAnalysisForAgent(
    @Param('runtimeAgentId') runtimeAgentId: string,
    @Query('platform') platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis[]> {
    if (!runtimeAgentId) {
      throw new BadRequestException('Agent runtime ID is required');
    }

    return this.analysisService.getLatestAnalysisForAgent(
      runtimeAgentId,
      platform,
    );
  }
}
