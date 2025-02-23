export type CacheStore = 'database' | 'redis' | 'filesystem';

export interface ElizaConfig {
  // Backend server configuration
  backendApiKey: string;
  backendPort: number;
  hostBackend: string;
  localDevelopment: string;

  // StarknetAgentKitServer
  agentServerApiKey: string;

  // AI configuration
  aiProviderApiKey: string;
  aiModel: string;
  aiProvider: string;
  anthropicApiKey: string;

  // Paradex configuration
  paradexNetwork: string;
  paradexAccountAddress?: string;
  paradexPrivateKey?: string;

  // Starknet configuration
  starknetRpcUrl: string;
}

export interface CreateElizaContainerConfig {
  name: string;
  characterConfig: Record<string, any>;
  starknetAddress: string;
  starknetPrivateKey: string;
  ethereumPrivateKey: string;
}

export interface ElizaContainerResult {
  containerId: string;
  port: number;
}

export interface IElizaConfigService {
  getConfig(): ElizaConfig;
  validateConfig(config: Partial<ElizaConfig>): void;
  generateContainerEnv(containerConfig: CreateElizaContainerConfig): string[];
}
