export const environmentConfig = () => ({
  // Admin and Authentication
  rateLimit: process.env.RATE_LIMIT,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW,

  // Starknet Configuration
  adminWalletPk: process.env.ADMIN_WALLET_PK,
  adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
  starknetRpcUrl: process.env.STARKNET_RPC_URL,
  ethTokenAddress: process.env.ETH_TOKEN_ADDRESS,
  ozAccountClassHash: process.env.OZ_ACCOUNT_CLASSHASH,

  // Agent Server Configuration
  agentServerApiKey: process.env.SERVER_API_KEY,

  // AI Provider Configuration
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  aiModel: process.env.AI_MODEL,
  aiProvider: process.env.AI_PROVIDER,

  // Paradex Configuration
  paradexNetwork: process.env.PARADEX_NETWORK,
  paradexAccountAddress: process.env.PARADEX_ACCOUNT_ADDRESS,
  paradexPrivateKey: process.env.PARADEX_PRIVATE_KEY,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
  ethereumAccountAddress: process.env.ETHEREUM_ACCOUNT_ADDRESS,

  // Backend Configuration
  hostBackend: process.env.HOST_BACKEND,
  backendApiKey: process.env.BACKEND_API_KEY,
});

export const validationSchema = {
  // Admin and Authentication
  BACKEND_API_KEY: {
    required: true,
    message: 'BACKEND_API_KEY is required for admin authentication',
  },
  RATE_LIMIT: {
    required: true,
    message: 'RATE_LIMIT defines the maximum number of requests allowed',
  },
  RATE_LIMIT_WINDOW: {
    required: true,
    message: 'RATE_LIMIT_WINDOW defines the time window for rate limiting',
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
  SERVER_API_KEY: {
    required: true,
    message: 'SERVER_API_KEY is required for agent authentication',
  },

  POSTGRES_USER: {
    required: true,
    message: 'POSTGRES_USER is required for agent database',
  },
  POSTGRES_PASSWORD: {
    required: true,
    message: 'POSTGRES_USER is required for agent database',
  },
  POSTGRES_ROOT_DB: {
    required: true,
    message: 'POSTGRES_USER is required for agent database',
  },
  POSTGRES_HOST: {
    required: true,
    message: 'POSTGRES_USER is required for agent database',
  },
  POSTGRES_PORT: {
    required: true,
    message: 'POSTGRES_USER is required for agent database',
  },
  AGENT_HOST_BACKEND: {
    required: true,
    message: 'AGENT_HOST_BACKEND is required for agent to backend connection',
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
  HOST_BACKEND: {
    required: true,
    message: 'HOST_BACKEND is required for backend connection',
  },
};
