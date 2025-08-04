import type { EnvContext, EnvHandler } from '../../dist/types/index.js';
import { SCHEMA_TYPE } from '../../dist/types/index.js';

// Environment handler with context
export default function createEnv(context: EnvContext<typeof process.env>): EnvHandler {
  // Can access existing environment during definition
  const defaultPort = context.env.DEFAULT_PORT ? parseInt(context.env.DEFAULT_PORT) : 3000;
  const defaultEnv = context.env.DEFAULT_ENV || 'development';
  
  return {
    NODE_ENV: {
      type: SCHEMA_TYPE.STRING,
      required: false,
      default: defaultEnv,
      enum: ['development', 'production', 'test'],
      errorMessage: 'NODE_ENV must be development, production, or test'
    },
    PORT: {
      type: SCHEMA_TYPE.NUMBER,
      required: false,
      default: defaultPort,
      min: 1000,
      max: 65535,
      errorMessage: 'PORT must be between 1000 and 65535'
    },
    API_URL: {
      type: SCHEMA_TYPE.STRING,
      required: true,
      minLength: 10,
      errorMessage: 'API_URL is required and must be a valid URL'
    },
    DEBUG: {
      type: SCHEMA_TYPE.BOOLEAN,
      required: false,
      default: false,
      errorMessage: 'DEBUG must be true or false'
    },
    AUTH_TOKEN: {
      type: SCHEMA_TYPE.STRING,
      required: context.env.NODE_ENV === 'production',
      minLength: 32,
      errorMessage: 'AUTH_TOKEN is required in production and must be at least 32 characters'
    },
    SUPPORT_EMAIL: {
      type: SCHEMA_TYPE.STRING,
      required: false,
      default: 'support@example.com',
      errorMessage: 'SUPPORT_EMAIL must be a valid email address'
    }
  };
}