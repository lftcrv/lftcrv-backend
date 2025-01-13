export interface EnvironmentVariables {
  NODE_ENV: string;
  API_KEY: string;
  RATE_LIMIT: number;
  RATE_LIMIT_WINDOW: number;
}

export const environmentConfig = () => ({
  nodeEnv: process.env.NODE_ENV,
  apiKey: process.env.API_KEY,
  rateLimit: process.env.RATE_LIMIT,
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
});

export const validationSchema = {
  API_KEY: {
    required: true,
    message: 'API_KEY is required for admin authentication',
  },
};
