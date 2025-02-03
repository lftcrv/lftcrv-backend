import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { TechnicalService } from './technical/technical.service';
import {
  CombinedAssetAnalysis,
  BatchAnalysisResult,
  AnalysisError,
  JsonValue,
  isJsonValue,
  isCombinedAssetAnalysis,
} from './analysis.types';
import { AnalysisType } from '@prisma/client';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly technicalService: TechnicalService,
  ) {}

  async analyzeSingleAsset(
    assetId: string,
  ): Promise<CombinedAssetAnalysis | AnalysisError> {
    const startTime = Date.now();

    try {
      // Get technical analysis
      const technicalAnalysis = await this.technicalService.analyzeMarkets([
        assetId,
      ]);
      const assetTechnical = technicalAnalysis.analyses[assetId];

      if (!assetTechnical) {
        throw new Error('Technical analysis failed');
      }

      // TODO: Implement social analysis when available
      const socialAnalysis = null;

      const analysis: CombinedAssetAnalysis = {
        assetId,
        timestamp: Date.now(),
        technical: assetTechnical,
        social: socialAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      };

      // Store in database
      // Ensure the analysis object is JSON-serializable
      const serializedAnalysis = JSON.parse(JSON.stringify(analysis));

      // Type check the serialized data
      if (!isJsonValue(serializedAnalysis)) {
        throw new Error(
          'Analysis data could not be serialized to JSON properly',
        );
      }

      await this.prisma.analysis.create({
        data: {
          type: AnalysisType.OVERALL,
          data: serializedAnalysis as any, // Required for Prisma's JSON type
          timestamp: new Date(),
          metadata: {
            assetId,
            processingTimeMs: Date.now() - startTime,
          } as any, // Required for Prisma's JSON type
        },
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing asset ${assetId}: ${error.message}`);
      return {
        assetId,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  async analyzeMultipleAssets(
    assetIds: string[],
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const results: BatchAnalysisResult = {
      successful: [],
      failed: [],
      metadata: {
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        processingTimeMs: 0,
      },
    };

    // Process assets in parallel with a concurrency limit
    const BATCH_SIZE = 5; // Adjust based on your API limits
    for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
      const batch = assetIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((assetId) => this.analyzeSingleAsset(assetId)),
      );

      batchResults.forEach((result) => {
        if ('error' in result) {
          results.failed.push(result);
          results.metadata.failureCount++;
        } else {
          results.successful.push(result);
          results.metadata.successCount++;
        }
      });
    }

    results.metadata.totalProcessed = assetIds.length;
    results.metadata.processingTimeMs = Date.now() - startTime;

    return results;
  }

  async getLatestAnalysis(
    assetId: string,
  ): Promise<CombinedAssetAnalysis | null> {
    const latestAnalysis = await this.prisma.analysis.findFirst({
      where: {
        type: AnalysisType.OVERALL,
        metadata: {
          path: ['assetId'],
          equals: assetId,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!latestAnalysis) return null;

    // Safely type check the retrieved data
    const data = latestAnalysis.data as unknown;
    if (!isJsonValue(data)) {
      this.logger.error(`Invalid data format for analysis of asset ${assetId}`);
      return null;
    }

    // Additional type check for CombinedAssetAnalysis structure
    if (!isCombinedAssetAnalysis(data)) {
      this.logger.error(
        `Data does not match CombinedAssetAnalysis structure for asset ${assetId}`,
      );
      return null;
    }

    return data;
  }

  async getLatestAnalyses(
    assetIds: string[],
  ): Promise<CombinedAssetAnalysis[]> {
    const analyses = await Promise.all(
      assetIds.map((assetId) => this.getLatestAnalysis(assetId)),
    );

    return analyses.filter(
      (analysis): analysis is CombinedAssetAnalysis => analysis !== null,
    );
  }
}
