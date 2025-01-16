import { Injectable } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthCheckService as TerminusHealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { IHealthCheckService } from './health.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthCheckService implements IHealthCheckService {
  constructor(
    private readonly health: TerminusHealthCheck,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return await this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const dbHealthy = await this.checkDatabase();
        return {
          database: {
            status: dbHealthy ? 'up' : 'down',
          },
        };
      },
      async (): Promise<HealthIndicatorResult> => {
        const starknetHealthy = await this.checkStarknet();
        return {
          starknet: {
            status: starknetHealthy ? 'up' : 'down',
          },
        };
      },
      async (): Promise<HealthIndicatorResult> => {
        const elizaHealthy = await this.checkElizaOS();
        return {
          elizaOS: {
            status: elizaHealthy ? 'up' : 'down',
          },
        };
      },
    ]);
  }

  async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkStarknet(): Promise<boolean> {
    try {
      const starknetEndpoint =
        this.configService.get<string>('STARKNET_ENDPOINT');
      const response = await fetch(starknetEndpoint);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkElizaOS(): Promise<boolean> {
    try {
      const elizaEndpoint = this.configService.get<string>('ELIZA_OS_ENDPOINT');
      const response = await fetch(elizaEndpoint);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
