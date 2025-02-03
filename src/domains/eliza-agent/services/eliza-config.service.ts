import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElizaConfig,
  CreateElizaContainerConfig,
  IElizaConfigService,
} from '../interfaces/eliza-config.interface';

@Injectable()
export class ElizaConfigService implements IElizaConfigService {
  private config: ElizaConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      // Cache configuration
      cacheStore: this.configService.get<'database' | 'redis' | 'filesystem'>(
        'CACHE_STORE',
        'database',
      ),
      redisUrl: this.configService.get<string>('REDIS_URL', ''),
      pgliteDataDir: this.configService.get<string>('PGLITE_DATA_DIR', ''),

      // Server configuration
      serverPort: this.configService.get<number>('SERVER_PORT', 3000),

      // API configuration
      backendApiKey: this.configService.get<string>('API_KEY'),
      backendPort: this.configService.get<number>('PORT'),

      // External services configuration
      anthropicApiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),

      // Starknet configuration
      starknetRpcUrl: this.configService.get<string>('NODE_URL'),
    };

    this.validateConfig(this.config);
  }

  getConfig(): ElizaConfig {
    return { ...this.config };
  }

  validateConfig(config: Partial<ElizaConfig>): void {
    const requiredFields = [
      'backendApiKey',
      'anthropicApiKey',
      'starknetRpcUrl',
    ];

    const missingFields = requiredFields.filter(
      (field) => !config[field as keyof ElizaConfig],
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required Eliza configuration fields: ${missingFields.join(', ')}`,
      );
    }

    if (config.cacheStore === 'redis' && !config.redisUrl) {
      throw new Error('Redis URL is required when using Redis cache store');
    }

    if (config.cacheStore === 'filesystem' && !config.pgliteDataDir) {
      throw new Error(
        'PGLite data directory is required when using filesystem cache store',
      );
    }
  }

  generateContainerEnv(containerConfig: CreateElizaContainerConfig): string[] {
    const envVars = [
      `CACHE_STORE=${this.config.cacheStore}`,
      `SERVER_PORT=${this.config.serverPort}`,
      `BACKEND_API_KEY=${this.config.backendApiKey}`,
      `BACKEND_PORT=${this.config.backendPort}`,
      `ANTHROPIC_API_KEY=${this.config.anthropicApiKey}`,
      `STARKNET_RPC_URL=${this.config.starknetRpcUrl}`,
      `STARKNET_ADDRESS=${containerConfig.starknetAddress}`,
      `STARKNET_PRIVATE_KEY=${containerConfig.starknetPrivateKey}`,
    ];

    // Add optional configuration based on cache store
    if (this.config.cacheStore === 'redis' && this.config.redisUrl) {
      envVars.push(`REDIS_URL=${this.config.redisUrl}`);
    }

    if (this.config.cacheStore === 'filesystem' && this.config.pgliteDataDir) {
      envVars.push(`PGLITE_DATA_DIR=${this.config.pgliteDataDir}`);
    }

    return envVars;
  }
}
