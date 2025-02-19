import { MarketAnalysis } from './technical/types';


export interface AnalysisMetadata {
  generatedAt: string;
  processingTimeMs: number;
  dataSource?: string;
  platform?: 'paradex' | 'avnu';
}

export interface SocialAnalysis {
  timestamp: number;
  sentiment: {
    score: number;
    volume: number;
    trend: 'positive' | 'negative' | 'neutral';
  };
  engagement: {
    total: number;
    change24h: number;
  };
  topics: Array<{
    name: string;
    sentiment: number;
    volume: number;
  }>;
}

// Prisma JSON value type
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

  export interface CombinedAssetAnalysis {
    assetId: string;
    timestamp: number;
    technical: MarketAnalysis['analyses'][string];
    social: SocialAnalysis | null;
    metadata?: AnalysisMetadata;
  }

// Type guard for CombinedAssetAnalysis
export function isCombinedAssetAnalysis(
  value: unknown,
): value is CombinedAssetAnalysis {
  if (!value || typeof value !== 'object') return false;

  const analysis = value as any;
  return (
    typeof analysis.assetId === 'string' &&
    typeof analysis.timestamp === 'number' &&
    typeof analysis.technical === 'object' &&
    (analysis.social === null || typeof analysis.social === 'object') &&
    (!analysis.metadata || typeof analysis.metadata === 'object')
  );
}

// Type guard to check if something is a valid JSON value
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value as object).every(isJsonValue);
  }
  return false;
}

export interface AnalysisError {
  assetId: string;
  error: string;
  timestamp: number;
}

export interface BatchAnalysisMetadata {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  processingTimeMs: number;
  platform?: 'paradex' | 'avnu';
}

export interface BatchAnalysisResult {
  successful: CombinedAssetAnalysis[];
  failed: AnalysisError[];
  metadata: BatchAnalysisMetadata;
}
