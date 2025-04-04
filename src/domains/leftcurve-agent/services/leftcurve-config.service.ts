import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElizaConfig,
  CreateElizaContainerConfig,
  IElizaConfigService,
} from '../interfaces/leftcurve-config.interface';

@Injectable()
export class ElizaConfigService implements IElizaConfigService {
  private config: ElizaConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      // Backend server configuration
      backendApiKey: this.configService.get<string>('BACKEND_API_KEY'),
      backendPort: this.configService.get<number>('BACKEND_PORT', 8080),
      hostBackend: this.configService.get<string>('HOST_BACKEND', 'localhost'),

      // StarknetAgentKit Server
      agentServerApiKey: this.configService.get<string>('SERVER_API_KEY'),
      agentPostgresUser: this.configService.get<string>('POSTGRES_USER'),
      agentPostgresPassword: this.configService.get<string>('POSTGRES_PASSWORD'),
      agentPostgresRootDb: this.configService.get<string>('POSTGRES_ROOT_DB'),
      agentPostgresHost: this.configService.get<string>('POSTGRES_HOST'),
      agentPostgresPort: this.configService.get<string>('POSTGRES_PORT'),

      // AI configuration
      aiProviderApiKey: this.configService.get<string>('AI_PROVIDER_API_KEY'),
      aiModel: this.configService.get<string>('AI_MODEL'),
      aiProvider: this.configService.get<string>('AI_PROVIDER'),

      // Legacy - to be removed
      anthropicApiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),

      // Paradex configuration
      paradexNetwork: this.configService.get<string>('PARADEX_NETWORK'),
      paradexAccountAddress: this.configService.get<string>(
        'PARADEX_ACCOUNT_ADDRESS',
      ),
      paradexPrivateKey: this.configService.get<string>('PARADEX_PRIVATE_KEY'),

      // Starknet configuration
      starknetRpcUrl: this.configService.get<string>('STARKNET_RPC_URL'),
    };

    this.validateConfig(this.config);
  }

  getConfig(): ElizaConfig {
    return { ...this.config };
  }

  validateConfig(config: Partial<ElizaConfig>): void {
    const requiredFields = [
      'backendApiKey',
      'aiProviderApiKey',
      'aiModel',
      'aiProvider',
      'paradexNetwork',
      'starknetRpcUrl',
    ];

    const missingFields = requiredFields.filter(
      (field) => !config[field as keyof ElizaConfig],
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration fields: ${missingFields.join(', ')}`,
      );
    }
  }

  generateContainerEnv(containerConfig: CreateElizaContainerConfig): string[] {
    const envVars = [
      // Backend server configuration
      `BACKEND_API_KEY=${this.config.backendApiKey}`,
      `BACKEND_PORT=${this.config.backendPort}`,
      `HOST_BACKEND=${this.config.hostBackend}`,

      // StarknetAgentKit Server
      `AGENT_SERVER_PORT=8080`,
      `SERVER_API_KEY=${this.config.agentServerApiKey}`,
      `POSTGRES_USER=${this.config.agentPostgresUser}`,
      `POSTGRES_PASSWORD=${this.config.agentPostgresPassword}`,
      `POSTGRES_ROOT_DB=${this.config.agentPostgresRootDb}`,
      `POSTGRES_HOST=${this.config.agentPostgresHost}`,
      `POSTGRES_PORT=${this.config.agentPostgresPort}`,

      // AI configuration
      `AI_PROVIDER_API_KEY=${this.config.aiProviderApiKey}`,
      `AI_MODEL=${this.config.aiModel}`,
      `AI_PROVIDER=${this.config.aiProvider}`,

      // Paradex configuration
      `PARADEX_NETWORK=${this.config.paradexNetwork}`,
      `ETHEREUM_PRIVATE_KEY=${containerConfig.ethereumPrivateKey}`,
      `ETHEREUM_ACCOUNT_ADDRESS=${containerConfig.ethereumAccountAddress}`,

      // Starknet configuration
      `STARKNET_RPC_URL=${this.config.starknetRpcUrl}`,
      `STARKNET_PUBLIC_ADDRESS=${containerConfig.starknetAddress}`,
      `STARKNET_PRIVATE_KEY=${containerConfig.starknetPrivateKey}`,

      // Other
      `DEFAULT_LOG_LEVEL=log`,
    ];

    return envVars;
  }
}
