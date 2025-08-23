import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createEnvHandler, validateEnvironment } from '../../../src/handlers/env/index.js';
import type { EnvDefinition } from '../../../src/handlers/env/types.js';

describe('Environment Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createEnvHandler', () => {
    it('should create an environment handler', () => {
      const definition: EnvDefinition = {
        schema: {
          NODE_ENV: { type: 'string', required: true },
          PORT: { type: 'number', defaultValue: 3000 }
        }
      };

      const handler = createEnvHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.validate).toBe('function');
    });

    it('should validate environment variables', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '8080';

      const definition: EnvDefinition = {
        schema: {
          NODE_ENV: { type: 'string', required: true },
          PORT: { type: 'number', required: false }
        }
      };

      const handler = createEnvHandler(definition);
      const result = handler.validate();

      expect(result.success).toBe(true);
      expect(result.data?.NODE_ENV).toBe('test');
      expect(result.data?.PORT).toBe(8080);
    });
  });

  describe('validateEnvironment', () => {
    it('should validate required environment variables', () => {
      process.env.REQUIRED_VAR = 'value';

      const schema = {
        REQUIRED_VAR: { type: 'string' as const, required: true }
      };

      const result = validateEnvironment(schema);
      expect(result.success).toBe(true);
      expect(result.data?.REQUIRED_VAR).toBe('value');
    });

    it('should use default values for missing variables', () => {
      delete process.env.OPTIONAL_VAR;

      const schema = {
        OPTIONAL_VAR: { type: 'string' as const, defaultValue: 'default' }
      };

      const result = validateEnvironment(schema);
      expect(result.success).toBe(true);
      expect(result.data?.OPTIONAL_VAR).toBe('default');
    });

    it('should fail validation for missing required variables', () => {
      delete process.env.REQUIRED_VAR;

      const schema = {
        REQUIRED_VAR: { type: 'string' as const, required: true }
      };

      const result = validateEnvironment(schema);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('REQUIRED_VAR');
    });

    it('should convert string values to correct types', () => {
      process.env.NUMBER_VAR = '42';
      process.env.BOOLEAN_VAR = 'true';

      const schema = {
        NUMBER_VAR: { type: 'number' as const },
        BOOLEAN_VAR: { type: 'boolean' as const }
      };

      const result = validateEnvironment(schema);
      expect(result.success).toBe(true);
      expect(result.data?.NUMBER_VAR).toBe(42);
      expect(result.data?.BOOLEAN_VAR).toBe(true);
    });
  });
});