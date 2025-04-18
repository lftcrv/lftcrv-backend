export const AUTH_CONSTANTS = {
  METADATA: {
    API_KEY_PROTECTED: 'API_KEY_PROTECTED',
  },
  CONFIG: {
    BACKEND_API_KEY: 'BACKEND_API_KEY',
  },
  HEADERS: {
    BACKEND_API_KEY: 'x-api-key',
  },
  ERROR_MESSAGES: {
    MISSING_ENV_VAR: 'BACKEND_API_KEY environment variable is not configured',
    MISSING_HEADER: 'API key is missing',
    INVALID_KEY: 'Invalid API key',
  },
  SWAGGER: {
    API_KEY_HEADER: {
      name: 'x-api-key',
      description: 'Admin API key',
      required: true,
    },
    UNAUTHORIZED_RESPONSE: {
      description: 'API key is missing or invalid',
      schema: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 401,
          },
          message: {
            type: 'string',
            example: 'Invalid API key',
          },
        },
      },
    },
  },
} as const;
