export type CacheStore = 'database' | 'redis' | 'filesystem';

export interface ElizaConfig {
  // Backend server configuration
  backendApiKey: string;
  backendPort: number;
  hostBackend: string;

  // StarknetAgentKitServer
  agentServerApiKey: string;

  agentPostgresUser: string;
  agentPostgresPassword: string;
  agentPostgresRootDb: string;
  agentPostgresHost: string;
  agentPostgresPort: string;

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
  agentConfig: Record<string, any>; // Nouveau format de configuration d'agent
  starknetAddress: string;
  starknetPrivateKey: string;
  ethereumPrivateKey: string;
  ethereumAccountAddress: string;
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
