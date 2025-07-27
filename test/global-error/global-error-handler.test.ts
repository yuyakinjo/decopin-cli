import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CLIError, ValidationError, ModuleError } from '../../src/types/errors.js';

describe('Global Error Handler', () => {
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    delete process.env.DEBUG;
    delete process.env.CLI_DEBUG;
  });

  describe('Validation Errors', () => {
    it('should handle validation errors with issues', async () => {
      const validationError: ValidationError = Object.assign(
        new Error('Validation failed'),
        {
          issues: [
            {
              path: [{ key: 'name' }],
              message: 'Name is required'
            },
            {
              path: [{ key: 'email' }, { key: 'format' }],
              message: 'Invalid email format'
            }
          ]
        }
      );

      // Import and execute the global error handler
      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(validationError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ An error occurred\n');
      expect(consoleErrorSpy).toHaveBeenCalledWith('📋 Validation Error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • name: Name is required');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • email.format: Invalid email format');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle validation errors without path', async () => {
      const validationError: ValidationError = Object.assign(
        new Error('Validation failed'),
        {
          issues: [
            {
              message: 'General validation error'
            }
          ]
        }
      );

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(validationError)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • value: General validation error');
    });
  });

  describe('Module Errors', () => {
    it('should handle module not found errors', async () => {
      const moduleError: ModuleError = Object.assign(
        new Error('Cannot find module \'missing-module\''),
        {
          code: 'ERR_MODULE_NOT_FOUND'
        }
      );

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(moduleError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('📦 Module Error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  The required module could not be found.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  Cannot find module \'missing-module\'');
    });
  });

  describe('Runtime Errors', () => {
    it('should handle standard Error instances', async () => {
      const runtimeError = new Error('Something went wrong');

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(runtimeError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('💥 Error Details:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  Something went wrong');
    });

    it('should handle unknown error types', async () => {
      const unknownError = 'String error' as any;

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(unknownError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('🔥 Unknown Error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('String error');
    });
  });

  describe('Debug Mode', () => {
    it('should show stack trace when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      const error = new Error('Test error with stack');

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(error)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📍 Stack Trace:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should show stack trace when CLI_DEBUG is set', async () => {
      process.env.CLI_DEBUG = 'true';
      const error = new Error('Test error with stack');

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(error)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📍 Stack Trace:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should not show stack trace when debug is not set', async () => {
      const error = new Error('Test error without debug');

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(error)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).not.toHaveBeenCalledWith('\n📍 Stack Trace:');
    });
  });

  describe('Error Tips', () => {
    it('should show validation-specific tips', async () => {
      const validationError: ValidationError = Object.assign(
        new Error('Validation failed'),
        {
          issues: [{ message: 'Test' }]
        }
      );

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(validationError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Check your input values against the required format');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Use --help to see parameter details');
    });

    it('should show module-specific tips', async () => {
      const moduleError: ModuleError = Object.assign(
        new Error('Module error'),
        {
          code: 'ERR_MODULE_NOT_FOUND'
        }
      );

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(moduleError)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Ensure all required files are present');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Check your project structure');
    });

    it('should show general tips for other errors', async () => {
      const error = new Error('General error');

      const createHandler = (await import('../../app/global-error.js')).default;
      const handler = createHandler();

      await expect(handler(error)).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Check your command syntax');
      expect(consoleErrorSpy).toHaveBeenCalledWith('  • Use --help to see available options');
    });
  });
});