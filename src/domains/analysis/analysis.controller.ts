import {
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CombinedAssetAnalysis, BatchAnalysisResult } from './analysis.types';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

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
    description: 'Comma-separated list of assets to analyze (e.g., "BTC,ETH")',
    type: String,
  })
  async generateAnalysis(
    @Query('assets') assetsQuery: string,
  ): Promise<BatchAnalysisResult> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assets = assetsQuery.toUpperCase().split(',');
    return this.analysisService.analyzeMultipleAssets(assets);
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
      'Comma-separated list of assets to get analysis for (e.g., "BTC,ETH")',
    type: String,
  })
  async getLatestAnalysis(
    @Query('assets') assetsQuery: string,
  ): Promise<CombinedAssetAnalysis[]> {
    if (!assetsQuery) {
      throw new BadRequestException('Assets parameter is required');
    }

    const assets = assetsQuery.toUpperCase().split(',');
    return this.analysisService.getLatestAnalyses(assets);
  }

  @Get('latest/:assetId')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get latest analysis for a single asset',
    description: 'Retrieves the most recent analysis for a specific asset',
  })
  async getLatestAssetAnalysis(
    @Query('assetId') assetId: string,
  ): Promise<CombinedAssetAnalysis | null> {
    if (!assetId) {
      throw new BadRequestException('Asset ID is required');
    }

    return this.analysisService.getLatestAnalysis(assetId.toUpperCase());
  }
}
