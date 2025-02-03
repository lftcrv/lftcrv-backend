export interface EnvironmentVariables {
  NODE_ENV: string;
  API_KEY: string;
  RATE_LIMIT: number;
  RATE_LIMIT_WINDOW: number;
  ADMIN_WALLET_PK: string;
  ADMIN_WALLET_ADDRESS: string;
  ETH_TOKEN_ADDRESS: string;
  OZ_ACCOUNT_CLASSHASH: string;
  NODE_URL: string;
  ANTHROPIC_API_KEY: string;
}

export const environmentConfig = () => ({
  nodeEnv: process.env.NODE_ENV,
  apiKey: process.env.API_KEY,
  rateLimit: process.env.RATE_LIMIT,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
  adminWalletPk: process.env.ADMIN_WALLET_PK,
  adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
  nodeUrl: process.env.NODE_URL,
  ethTokenAddress: process.env.ETH_TOKEN_ADDRESS,
  ozAccountClassHash: process.env.OZ_ACCOUNT_CLASSHASH,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

export const validationSchema = {
  API_KEY: {
    required: true,
    message: 'API_KEY is required for admin authentication',
  },
  ADMIN_WALLET_PK: {
    required: true,
    message: 'ADMIN_WALLET_PK is required for agent deployment',
  },
  NODE_URL: {
    required: true,
    message: 'NODE_URL is required for blockchain interaction',
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
  ANTHROPIC_API_KEY: {
    required: true,
    message: 'ANTHROPIC_API_KEY is required for agent deployment',
  },
};
