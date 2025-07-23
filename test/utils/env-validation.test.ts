import { describe, it, expect } from 'bun:test';
import { parseEnvironmentVariables, createTypeSafeEnv } from '../../src/utils/validation.js';
import type { EnvSchema } from '../../src/types/validation.js';
import { SCHEMA_TYPE } from '../../src/types/validation.js';

describe('Environment Variable Validation', () => {
  describe('parseEnvironmentVariables', () => {
    const createTestEnvSchema = (): EnvSchema => ({
      NODE_ENV: {
        type: SCHEMA_TYPE.STRING,
        required: false,
        default: 'development',
        enum: ['development', 'production', 'test'],
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
        min: 1000,
        max: 65535,
      },
      DEBUG: {
        type: SCHEMA_TYPE.BOOLEAN,
        required: false,
        default: false,
      },
    });

    it('should parse valid environment variables successfully', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        NODE_ENV: 'production',
        API_KEY: 'test-api-key-12345',
        PORT: '8080',
        DEBUG: 'true',
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        NODE_ENV: 'production',
        API_KEY: 'test-api-key-12345',
        PORT: 8080,
        DEBUG: true,
      });
    });

    it('should apply default values for missing optional variables', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        API_KEY: 'test-api-key-12345',
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        NODE_ENV: 'development',
        API_KEY: 'test-api-key-12345',
        PORT: 3000,
        DEBUG: false,
      });
    });

    it('should fail validation for missing required variables', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        NODE_ENV: 'development',
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].path).toEqual(['API_KEY']);
      expect(result.error?.issues?.[0].message).toBe('API_KEY is required');
    });

    it('should validate string length constraints', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        API_KEY: 'short', // Too short
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe(
        'API_KEY must be at least 10 characters'
      );
    });

    it('should validate number range constraints', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        API_KEY: 'test-api-key-12345',
        PORT: '999', // Too low
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe('PORT must be at least 1000');
    });

    it('should validate enum constraints', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        API_KEY: 'test-api-key-12345',
        NODE_ENV: 'invalid', // Not in enum
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe(
        'NODE_ENV must be one of: development, production, test'
      );
    });

    it('should handle boolean conversion correctly', () => {
      const envSchema = createTestEnvSchema();
      const mockEnv = {
        API_KEY: 'test-api-key-12345',
        DEBUG: 'false',
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(true);
      expect(result.data?.DEBUG).toBe(false);

      // Test 'true' string
      const mockEnv2 = {
        API_KEY: 'test-api-key-12345',
        DEBUG: 'true',
      };

      const result2 = parseEnvironmentVariables(envSchema, mockEnv2);

      expect(result2.success).toBe(true);
      expect(result2.data?.DEBUG).toBe(true);

      // Test '1' string
      const mockEnv3 = {
        API_KEY: 'test-api-key-12345',
        DEBUG: '1',
      };

      const result3 = parseEnvironmentVariables(envSchema, mockEnv3);

      expect(result3.success).toBe(true);
      expect(result3.data?.DEBUG).toBe(true);
    });

    it('should use custom error messages when provided', () => {
      const envSchema: EnvSchema = {
        API_KEY: {
          type: SCHEMA_TYPE.STRING,
          required: true,
          minLength: 10,
          errorMessage: 'Custom API_KEY error message',
        },
      };

      const mockEnv = {
        API_KEY: 'short',
      };

      const result = parseEnvironmentVariables(envSchema, mockEnv);

      expect(result.success).toBe(false);
      expect(result.error?.issues?.[0].message).toBe('Custom API_KEY error message');
    });
  });

  describe('createTypeSafeEnv', () => {
    it('should create type-safe environment variables from function', async () => {
      const createEnv = () => ({
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
      });

      const mockEnv = {
        API_KEY: 'test-api-key-12345',
      };

      const result = await createTypeSafeEnv(createEnv, mockEnv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        NODE_ENV: 'development',
        API_KEY: 'test-api-key-12345',
      });
    });

    it('should handle errors gracefully', async () => {
      const createEnv = () => {
        throw new Error('Failed to create env schema');
      };

      const result = await createTypeSafeEnv(createEnv, {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to create env schema');
    });
  });
});