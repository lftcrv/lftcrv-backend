import { HealthCheckResult } from '@nestjs/terminus';

export interface IHealthCheckService {
  check(): Promise<HealthCheckResult>;
  checkDatabase(): Promise<boolean>;
  checkStarknet(): Promise<boolean>;
  checkElizaOS(): Promise<boolean>;
}

export const HealthCheckToken = Symbol('IHealthCheckService');
