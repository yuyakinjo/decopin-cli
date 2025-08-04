import type { EnvHandler } from '../dist/types/index.js';
import { SCHEMA_TYPE } from '../dist/types/index.js';

// 環境変数の型を定義
export interface AppEnv {
  NODE_ENV: string;
  API_KEY: string;
  PORT: number;
  DEBUG: boolean;
}

export default function createEnv(): EnvHandler {
  return {
      NODE_ENV: {
        type: SCHEMA_TYPE.STRING,
        required: false,
        default: 'development',
        errorMessage: 'NODE_ENV must be development, production, or test',
      },
      API_KEY: {
        type: SCHEMA_TYPE.STRING,
        required: true,
        minLength: 10,
        errorMessage: 'API_KEY is required and must be at least 10 characters',
      },
      PORT: {
        type: SCHEMA_TYPE.NUMBER,
        required: false,
        default: 3000,
        min: 1000,
        max: 65535,
        errorMessage: 'PORT must be between 1000 and 65535',
      },
      DEBUG: {
        type: SCHEMA_TYPE.BOOLEAN,
        required: false,
        default: false,
        errorMessage: 'DEBUG must be true or false',
      },
  };
}