import { describe, it, expect } from 'bun:test';
import { createErrorHandler, formatError } from '../../../src/handlers/error/index.js';
import type { ErrorDefinition } from '../../../src/handlers/error/types.js';

describe('Error Handler', () => {
  describe('createErrorHandler', () => {
    it('should create an error handler with valid definition', () => {
      const definition: ErrorDefinition = {
        message: 'Test error occurred',
        code: 'TEST_ERROR',
        exitCode: 1
      };

      const handler = createErrorHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.handle).toBe('function');
    });

    it('should handle errors with custom formatting', () => {
      const definition: ErrorDefinition = {
        message: 'Custom error',
        code: 'CUSTOM_ERROR',
        exitCode: 2,
        formatter: (error) => `Custom: ${error.message}`
      };

      const handler = createErrorHandler(definition);
      const result = handler.handle(new Error('test'));

      expect(result.formatted).toContain('Custom:');
      expect(result.exitCode).toBe(2);
    });
  });

  describe('formatError', () => {
    it('should format standard errors', () => {
      const error = new Error('Standard error message');
      const formatted = formatError(error);

      expect(formatted).toContain('Standard error message');
    });

    it('should format validation errors', () => {
      const validationError = Object.assign(new Error('Validation failed'), {
        issues: [
          { path: ['name'], message: 'Name is required' },
          { path: ['email'], message: 'Invalid email' }
        ]
      });

      const formatted = formatError(validationError);

      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('Name is required');
      expect(formatted).toContain('Invalid email');
    });

    it('should handle unknown error types', () => {
      const unknownError = 'String error';
      const formatted = formatError(unknownError);

      expect(formatted).toContain('String error');
    });
  });
});