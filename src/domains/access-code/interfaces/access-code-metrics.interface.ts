import { AccessCode, FailedAttempt } from '../entities/access-code.entity';

export interface IAccessCodeMetrics {
  totalCodes: number;
  usedCodes: number;
  unusedCodes: number;
  failedAttempts: number;
  successRate: string;
  recentCodes: AccessCode[];
  recentFailedAttempts: FailedAttempt[];
}

export interface IAccessCodeMetricsService {
  getMetrics(): Promise<IAccessCodeMetrics>;
}
