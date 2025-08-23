import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateEnvTypes } from '../../src/generator/env-types-generator';

describe('EnvTypesGenerator', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  const envFilePath = path.join(testDir, 'env.ts');
  const outputPath = path.join(testDir, 'generated', 'env-types.ts');

  beforeEach(() => {
    // テスト用のディレクトリを作成
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // テスト用のディレクトリをクリーンアップ
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should generate types from env schema with SCHEMA_TYPE', () => {
    // テスト用のenv.tsファイルを作成
    const envContent = `
import type { EnvHandler } from '../dist/types/index.js';
import { SCHEMA_TYPE } from '../dist/types/index.js';

const envSchema = {
  NODE_ENV: {
    type: SCHEMA_TYPE.STRING,
    required: false,
    default: 'development',
  },
  API_KEY: {
    type: SCHEMA_TYPE.STRING,
    required: true,
    minLength: 10,
  },
  PORT: {
    type: SCHEMA_TYPE.NUMBER,
    required: false,
    default: 3000,
  },
  DEBUG: {
    type: SCHEMA_TYPE.BOOLEAN,
    required: false,
    default: false,
  },
} as const;

export default function createEnv(): EnvHandler {
  return envSchema;
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成を実行
    generateEnvTypes(envFilePath, outputPath);

    // 生成されたファイルを確認
    expect(fs.existsSync(outputPath)).toBe(true);

    const generatedContent = fs.readFileSync(outputPath, 'utf-8');
    
    // 生成された型定義を検証
    expect(generatedContent).toContain('export interface AppEnv');
    expect(generatedContent).toContain('NODE_ENV: string;');
    expect(generatedContent).toContain('API_KEY: string;');
    expect(generatedContent).toContain('PORT: number;');
    expect(generatedContent).toContain('DEBUG: boolean;');
    expect(generatedContent).toContain('// This file is auto-generated');
  });

  it('should handle string literal types', () => {
    const envContent = `
const envSchema = {
  LOG_LEVEL: {
    type: 'string',
    required: false,
    default: 'info',
  },
  MAX_RETRIES: {
    type: 'number',
    required: false,
    default: 3,
  },
  ENABLE_CACHE: {
    type: 'boolean',
    required: false,
    default: true,
  },
} as const;

export default function createEnv() {
  return envSchema;
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成を実行
    generateEnvTypes(envFilePath, outputPath);

    // 生成されたファイルを確認
    const generatedContent = fs.readFileSync(outputPath, 'utf-8');
    
    expect(generatedContent).toContain('LOG_LEVEL: string;');
    expect(generatedContent).toContain('MAX_RETRIES: number;');
    expect(generatedContent).toContain('ENABLE_CACHE: boolean;');
  });

  it('should handle legacy function return format', () => {
    const envContent = `
import { SCHEMA_TYPE } from '../dist/types/index.js';

export default function createEnv() {
  return {
    DATABASE_URL: {
      type: SCHEMA_TYPE.STRING,
      required: true,
    },
    POOL_SIZE: {
      type: SCHEMA_TYPE.NUMBER,
      required: false,
      default: 10,
    },
  };
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成を実行
    generateEnvTypes(envFilePath, outputPath);

    // 生成されたファイルを確認
    const generatedContent = fs.readFileSync(outputPath, 'utf-8');
    
    expect(generatedContent).toContain('DATABASE_URL: string;');
    expect(generatedContent).toContain('POOL_SIZE: number;');
  });

  it('should generate empty interface when schema is empty', () => {
    const envContent = `
export default function createEnv() {
  return {};
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成を実行（空のスキーマでもエラーにならない）
    generateEnvTypes(envFilePath, outputPath);

    // 空のインターフェースが生成されることを確認
    const generatedContent = fs.readFileSync(outputPath, 'utf-8');
    expect(generatedContent).toContain('export interface AppEnv {');
    expect(generatedContent).toContain('}');
  });

  it('should throw error when file has no valid schema pattern', () => {
    const envContent = `
// This file has no createEnv function or envSchema const
export const someOtherFunction = () => {
  return { test: 'value' };
};
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成がエラーをスローすることを確認
    expect(() => {
      generateEnvTypes(envFilePath, outputPath);
    }).toThrow('envSchema not found in env.ts');
  });

  it('should create output directory if it does not exist', () => {
    const envContent = `
import { SCHEMA_TYPE } from '../dist/types/index.js';

const envSchema = {
  TEST_VAR: {
    type: SCHEMA_TYPE.STRING,
    required: true,
  },
} as const;

export default function createEnv() {
  return envSchema;
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 出力ディレクトリが存在しないことを確認
    const outputDir = path.dirname(outputPath);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    expect(fs.existsSync(outputDir)).toBe(false);

    // 型生成を実行
    generateEnvTypes(envFilePath, outputPath);

    // 出力ディレクトリとファイルが作成されたことを確認
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('should handle complex nested structures', () => {
    const envContent = `
import { SCHEMA_TYPE } from '../dist/types/index.js';

const envSchema = {
  APP_NAME: {
    type: SCHEMA_TYPE.STRING,
    required: true,
    minLength: 1,
    maxLength: 100,
    errorMessage: 'App name is required',
  },
  TIMEOUT_MS: {
    type: SCHEMA_TYPE.NUMBER,
    required: false,
    default: 5000,
    min: 1000,
    max: 30000,
    errorMessage: 'Timeout must be between 1000 and 30000',
  },
  FEATURE_FLAGS: {
    type: SCHEMA_TYPE.STRING, // Will be parsed as JSON
    required: false,
    default: '{}',
  },
} as const;

export default function createEnv() {
  return envSchema;
}
`;

    fs.writeFileSync(envFilePath, envContent);

    // 型生成を実行
    generateEnvTypes(envFilePath, outputPath);

    // 生成されたファイルを確認
    const generatedContent = fs.readFileSync(outputPath, 'utf-8');
    
    // 追加のフィールドは無視され、型のみが生成されることを確認
    expect(generatedContent).toContain('APP_NAME: string;');
    expect(generatedContent).toContain('TIMEOUT_MS: number;');
    expect(generatedContent).toContain('FEATURE_FLAGS: string;');
    
    // エラーメッセージや制約は型定義に含まれないことを確認
    expect(generatedContent).not.toContain('minLength');
    expect(generatedContent).not.toContain('errorMessage');
  });
});