import { IAccessCodeGenerator } from './access-code-generator.interface';
import { IAccessCodeService } from './access-code-service.interface';
import { IAccessCodeMetricsService } from './access-code-metrics.interface';

export type {
  IAccessCodeGenerator,
  IAccessCodeService,
  IAccessCodeMetricsService,
};

export const AccessCodeTokens = {
  Generator: Symbol('IAccessCodeGenerator'),
  Service: Symbol('IAccessCodeService'),
  Metrics: Symbol('IAccessCodeMetricsService'),
} as const;
