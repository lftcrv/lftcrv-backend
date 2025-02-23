export interface EnvironmentVariables {
  API_KEY: string;
  RATE_LIMIT: number;
  RATE_LIMIT_WINDOW: number;
  ADMIN_WALLET_PK: string;
  ADMIN_WALLET_ADDRESS: string;
  ETH_TOKEN_ADDRESS: string;
  OZ_ACCOUNT_CLASSHASH: string;
  STARKNET_RPC_URL: string;
  ANTHROPIC_API_KEY: string; // TODO: should be removed

  AGENT_SERVER_PORT: number;
  AGENT_SERVER_API_KEY: string;
  AI_PROVIDER_API_KEY: string;
  AI_MODEL: string;
  AI_PROVIDER: string;
  PARADEX_NETWORK: string;
  PARADEX_ACCOUNT_ADDRESS: string;
  PARADEX_PRIVATE_KEY: string;
  ETHEREUM_ACCOUNT_ADDRESS: string;
  ETHEREUM_PRIVATE_KEY: string;
  HOST_BACKEND: string;
  LOCAL_DEVELOPMENT: string;
  BACKEND_API_KEY: string;
}

export const environmentConfig = () => ({
  // Admin and Authentication
  apiKey: process.env.API_KEY,
  rateLimit: process.env.RATE_LIMIT,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW,

  // Starknet Configuration
  adminWalletPk: process.env.ADMIN_WALLET_PK,
  adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
  nodeUrl: process.env.STARKNET_RPC_URL,
  ethTokenAddress: process.env.ETH_TOKEN_ADDRESS,
  ozAccountClassHash: process.env.OZ_ACCOUNT_CLASSHASH,

  // Agent Server Configuration
  agentServerPort: parseInt(process.env.AGENT_SERVER_PORT, 10) || 8080,
  agentServerApiKey: process.env.AGENT_SERVER_API_KEY,

  // AI Provider Configuration
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  aiModel: process.env.AI_MODEL,
  aiProvider: process.env.AI_PROVIDER,

  // Paradex Configuration
  paradexNetwork: process.env.PARADEX_NETWORK,
  paradexAccountAddress: process.env.PARADEX_ACCOUNT_ADDRESS,
  paradexPrivateKey: process.env.PARADEX_PRIVATE_KEY,
  ethereumAccountAddress: process.env.ETHEREUM_ACCOUNT_ADDRESS,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,

  // Backend Configuration
  hostBackend: process.env.HOST_BACKEND,
  localDevelopment: process.env.LOCAL_DEVELOPMENT === 'TRUE',
  backendApiKey: process.env.BACKEND_API_KEY,
});

export const validationSchema = {
  // Admin and Authentication
  API_KEY: {
    required: true,
    message: 'API_KEY is required for admin authentication',
  },

  // Starknet Configuration
  ADMIN_WALLET_PK: {
    required: true,
    message: 'ADMIN_WALLET_PK is required for agent deployment',
  },
  STARKNET_RPC_URL: {
    required: true,
    message: 'STARKNET_RPC_URL is required for blockchain interaction',
  },
  ADMIN_WALLET_ADDRESS: {
    required: true,
    message: 'ADMIN_WALLET_ADDRESS is required for agent deployment',
  },
  ETH_TOKEN_ADDRESS: {
    required: true,
    message: 'ETH_TOKEN_ADDRESS is required for agent deployment',
  },
  OZ_ACCOUNT_CLASSHASH: {
    required: true,
    message: 'OZ_ACCOUNT_CLASSHASH is required for agent deployment',
  },

  // Agent Server Configuration
  AGENT_SERVER_API_KEY: {
    required: true,
    message: 'AGENT_SERVER_API_KEY is required for agent authentication',
  },

  // AI Provider Configuration
  AI_PROVIDER_API_KEY: {
    required: true,
    message: 'AI_PROVIDER_API_KEY is required for AI interaction',
  },
  AI_MODEL: {
    required: true,
    message: 'AI_MODEL is required for AI configuration',
  },
  AI_PROVIDER: {
    required: true,
    message: 'AI_PROVIDER is required for AI configuration',
  },

  // Paradex Configuration
  PARADEX_NETWORK: {
    required: true,
    message: 'PARADEX_NETWORK is required for Paradex configuration',
  },
  PARADEX_ACCOUNT_ADDRESS: {
    required: false,
    message: 'PARADEX_ACCOUNT_ADDRESS is required for Paradex configuration',
  },
  PARADEX_PRIVATE_KEY: {
    required: false,
    message: 'PARADEX_PRIVATE_KEY is required for Paradex authentication',
  },
  ETHEREUM_ACCOUNT_ADDRESS: {
    required: false,
    message: 'ETHEREUM_ACCOUNT_ADDRESS is required for Ethereum interaction',
  },
  ETHEREUM_PRIVATE_KEY: {
    required: false,
    message: 'ETHEREUM_PRIVATE_KEY is required for Ethereum authentication',
  },

  // Agent starknet Wallet
  STARKNET_PRIVATE_KEY: {
    required: false,
    message: 'STARKNET_PRIVATE_KEY is required for Starknet agent',
  },
  STARKNET_PUBLIC_ADDRESS: {
    required: false,
    message: 'STARKNET_PUBLIC_ADDRESS is required for Starknet',
  },

  // Backend Configuration
  BACKEND_API_KEY: {
    required: true,
    message: 'BACKEND_API_KEY is required for backend authentication',
  },
};
