export type CacheStore = 'database' | 'redis' | 'filesystem';

export interface ElizaConfig {
  // Cache configuration
  cacheStore: CacheStore;
  redisUrl?: string;
  pgliteDataDir?: string;

  // Server configuration
  serverPort: number;

  // API configuration
  backendApiKey: string;
  backendPort: number;

  // External services configuration
  anthropicApiKey: string;

  // Starknet configuration
  starknetAddress?: string;
  starknetPrivateKey?: string;
  starknetRpcUrl: string;
}

export interface CreateElizaContainerConfig {
  name: string;
  characterConfig: Record<string, any>;
  starknetAddress: string;
  starknetPrivateKey: string;
}

export interface ElizaContainerResult {
  containerId: string;
  port: number;
  runtimeAgentId?: string;
}

export interface IElizaConfigService {
  getConfig(): ElizaConfig;
  validateConfig(config: Partial<ElizaConfig>): void;
  generateContainerEnv(containerConfig: CreateElizaContainerConfig): string[];
}
