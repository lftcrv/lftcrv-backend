import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { Platform } from './technical/types';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly technicalService: TechnicalService,
  ) {}

  async analyzeSingleAsset(
    assetId: string,
    platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis | AnalysisError> {
    const startTime = Date.now();

    try {
      const technicalAnalysis = await this.technicalService.analyzeMarkets(
        [assetId],
        platform,
      );
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
        // social: socialAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          // platform,
          dataSource: platform === 'paradex' ? 'Paradex' : 'AVNU',
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
            platform,
            processingTimeMs: Date.now() - startTime,
          } as any, // Required for Prisma's JSON type
        },
      });

      return analysis;
    } catch (error) {
      this.logger.error(
        `Error analyzing asset ${assetId} on ${platform}: ${error.message}`,
      );
      return {
        assetId,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  async analyzeMultipleAssets(
    assetIds: string[],
    platform: Platform = 'paradex',
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
        platform,
      },
    };

    // Process assets in parallel with a concurrency limit
    const BATCH_SIZE = 5; // Adjust based on your API limits
    for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
      const batch = assetIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((assetId) => this.analyzeSingleAsset(assetId, platform)),
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
    platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis | null> {
    const latestAnalysis = await this.prisma.analysis.findFirst({
      where: {
        type: AnalysisType.OVERALL,
        metadata: {
          path: ['assetId'],
          equals: assetId,
        },
        AND: {
          metadata: {
            path: ['platform'],
            equals: platform,
          },
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
      this.logger.error(
        `Invalid data format for analysis of asset ${assetId} on ${platform}`,
      );
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
    platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis[]> {
    const analyses = await Promise.all(
      assetIds.map((assetId) => this.getLatestAnalysis(assetId, platform)),
    );

    return analyses.filter(
      (analysis): analysis is CombinedAssetAnalysis => analysis !== null,
    );
  }

  async getLatestAnalysisForAgent(
    runtimeAgentId: string,
    platform: Platform = 'paradex',
  ): Promise<CombinedAssetAnalysis[]> {
    try {
      // Find the agent by runtimeAgentId
      const agent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId,
        },
      });

      if (!agent) {
        throw new BadRequestException(
          `Agent with runtime ID ${runtimeAgentId} not found`,
        );
      }

      // Get the agent's selected cryptocurrencies
      if (!agent.selectedCryptos) {
        throw new BadRequestException(
          `Agent ${agent.name} has no selected cryptocurrencies`,
        );
      }

      // Split the comma-separated string into an array
      const selectedCryptos = agent.selectedCryptos.split(',');

      if (selectedCryptos.length === 0) {
        throw new BadRequestException(
          `Agent ${agent.name} has no selected cryptocurrencies`,
        );
      }

      // Get latest analysis for each crypto
      const analyses = await this.getLatestAnalyses(selectedCryptos, platform);

      // Extract analysisPeriod from agent's configuration
      let analysisPeriod = 2; // Default to a balanced approach if not specified
      try {
        if (agent.characterConfig) {
          const config =
          typeof agent.characterConfig === 'string'
          ? JSON.parse(agent.characterConfig)
          : agent.characterConfig;
          
          if (config && typeof config.analysis_period === 'number') {
            analysisPeriod = Math.min(Math.max(config.analysis_period, 0), 5);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Could not parse agent's characterConfig: ${error.message}`,
        );
      }

      return analyses.map((analysis) => {
        const filteredAnalysis = { ...analysis };

        if (
          filteredAnalysis.technical &&
          filteredAnalysis.technical.keySignals
        ) {
          delete filteredAnalysis.technical.keySignals.longTerm;

          // Select signals based on analysisPeriod
          const signals = this.selectSignalsByPreference(
            filteredAnalysis.technical.keySignals,
            analysisPeriod,
          );

          filteredAnalysis.technical.keySignals = signals;
        }

        return filteredAnalysis;
      });
    } catch (error) {
      this.logger.error(
        `Failed to get analysis for agent ${runtimeAgentId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to get analysis for agent: ${error.message}`,
      );
    }
  }

  /**
   * Helper method to select the most relevant signals based on the agent's analysis period preference
   * @param keySignals The original key signals from the analysis
   * @param analysisPeriod The agent's preference (0-5) where 0 = short-term, 5 = medium-term
   * @returns Filtered key signals with maximum 5 most relevant indicators
   */
  private selectSignalsByPreference(
    keySignals: any,
    analysisPeriod: number,
  ): any {
    const result: any = {};

    // Lower analysisPeriod favors short-term signals, higher favors medium-term
    const shortTermWeight = Math.max(0, 5 - analysisPeriod) / 5;
    const mediumTermWeight = Math.min(1, analysisPeriod / 5);

    const signalCandidates = [];

    // Add short-term signals with appropriate weighting
    if (keySignals.shortTerm) {
      if (keySignals.shortTerm.momentum?.rsi) {
        signalCandidates.push({
          type: 'shortTerm',
          category: 'rsi',
          weight: shortTermWeight * 1.0,
          data: keySignals.shortTerm.momentum.rsi,
        });
      }

      if (keySignals.shortTerm.momentum?.macd) {
        signalCandidates.push({
          type: 'shortTerm',
          category: 'macd',
          weight: shortTermWeight * 0.9,
          data: keySignals.shortTerm.momentum.macd,
        });
      }

      if (keySignals.shortTerm.momentum?.stochastic) {
        signalCandidates.push({
          type: 'shortTerm',
          category: 'stochastic',
          weight: shortTermWeight * 0.8,
          data: keySignals.shortTerm.momentum.stochastic,
        });
      }

      if (
        keySignals.shortTerm.patterns?.recent &&
        keySignals.shortTerm.patterns.recent.length > 0
      ) {
        signalCandidates.push({
          type: 'shortTerm',
          category: 'patterns',
          weight: shortTermWeight * 0.7,
          data: keySignals.shortTerm.patterns.recent,
        });
      }
    }

    // Add medium-term signals with appropriate weighting
    if (keySignals.mediumTerm) {
      if (keySignals.mediumTerm.trend?.primary) {
        signalCandidates.push({
          type: 'mediumTerm',
          category: 'trend',
          weight: mediumTermWeight * 1.0,
          data: keySignals.mediumTerm.trend.primary,
        });
      }

      if (keySignals.mediumTerm.technicals?.ichimoku) {
        signalCandidates.push({
          type: 'mediumTerm',
          category: 'ichimoku',
          weight: mediumTermWeight * 0.9,
          data: keySignals.mediumTerm.technicals.ichimoku,
        });
      }

      if (keySignals.mediumTerm.technicals?.momentum?.adx) {
        signalCandidates.push({
          type: 'mediumTerm',
          category: 'adx',
          weight: mediumTermWeight * 0.8,
          data: keySignals.mediumTerm.technicals.momentum.adx,
        });
      }

      if (keySignals.mediumTerm.technicals?.keltnerChannel) {
        signalCandidates.push({
          type: 'mediumTerm',
          category: 'keltnerChannel',
          weight: mediumTermWeight * 0.7,
          data: keySignals.mediumTerm.technicals.keltnerChannel,
        });
      }

      if (keySignals.mediumTerm.trend?.price?.volatility?.atr) {
        signalCandidates.push({
          type: 'mediumTerm',
          category: 'atr',
          weight: mediumTermWeight * 0.6,
          data: keySignals.mediumTerm.trend.price.volatility.atr,
        });
      }
    }

    // Sort by weight, and take top 5
    const selectedSignals = signalCandidates
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    result.shortTerm = { momentum: {}, patterns: { recent: [] } };
    result.mediumTerm = {
      trend: { primary: {}, price: { volatility: {} } },
      technicals: { momentum: {}, ichimoku: {}, keltnerChannel: {} },
    };

    selectedSignals.forEach((signal) => {
      if (signal.type === 'shortTerm') {
        if (signal.category === 'patterns') {
          result.shortTerm.patterns.recent = signal.data;
        } else {
          result.shortTerm.momentum[signal.category] = signal.data;
        }
      } else if (signal.type === 'mediumTerm') {
        if (signal.category === 'trend') {
          result.mediumTerm.trend.primary = signal.data;
        } else if (signal.category === 'atr') {
          result.mediumTerm.trend.price.volatility.atr = signal.data;
        } else if (
          signal.category === 'ichimoku' ||
          signal.category === 'keltnerChannel'
        ) {
          result.mediumTerm.technicals[signal.category] = signal.data;
        } else {
          result.mediumTerm.technicals.momentum[signal.category] = signal.data;
        }
      }
    });

    return result;
  }
}
