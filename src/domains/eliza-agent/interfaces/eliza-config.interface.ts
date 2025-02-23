export type CacheStore = 'database' | 'redis' | 'filesystem';

export interface ElizaConfig {
  // Server configuration
  serverPort: number;
  serverApiKey: string;
  backendApiKey: string;
  backendPort: number;

  // StarknetAgentKitServer
  agentListeningPort: number;
  
  // AI configuration
  anthropicApiKey: string;
  aiProviderApiKey: string;
  aiModel: string;
  aiProvider: string;

  // Paradex configuration
  paradexNetwork: string;
  paradexAccountAddress?: string;
  paradexPrivateKey?: string;

  // Starknet configuration
  starknetRpcUrl: string;
  hostBackend: string;
  localDevelopment: boolean;
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
