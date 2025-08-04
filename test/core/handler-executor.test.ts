import { describe, expect, test } from 'bun:test';
import { HandlerExecutor } from '../../src/core/handler-executor.js';
import { EXECUTION_ORDER } from '../../src/types/handler-registry.js';
import type { Context } from '../../src/types/context.js';
import type { LoadedHandler } from '../../src/core/handler-executor.js';

describe('HandlerExecutor', () => {
  test('should initialize with handler registry', () => {
    const executor = new HandlerExecutor();
    expect(executor).toBeDefined();
  });

  describe('getExecutionOrder', () => {
    test('should return all handlers sorted by execution order', () => {
      const executor = new HandlerExecutor();
      const handlers = executor.getExecutionOrder('all');
      
      expect(handlers.length).toBe(8);
      expect(handlers[0].name).toBe('global-error');
      expect(handlers[handlers.length - 1].name).toBe('error');
      
      // Check order is correct
      for (let i = 1; i < handlers.length; i++) {
        expect(handlers[i].executionOrder).toBeGreaterThanOrEqual(handlers[i - 1].executionOrder);
      }
    });

    test('should filter by global scope', () => {
      const executor = new HandlerExecutor();
      const handlers = executor.getExecutionOrder('global');
      
      expect(handlers.length).toBe(4);
      expect(handlers.every(h => h.scope === 'global')).toBe(true);
      expect(handlers.map(h => h.name)).toEqual(['global-error', 'env', 'version', 'middleware']);
    });

    test('should filter by command scope', () => {
      const executor = new HandlerExecutor();
      const handlers = executor.getExecutionOrder('command');
      
      expect(handlers.length).toBe(4);
      expect(handlers.every(h => h.scope === 'command')).toBe(true);
      expect(handlers.map(h => h.name)).toEqual(['help', 'params', 'command', 'error']);
    });
  });

  describe('validateDependencies', () => {
    test('should validate when all dependencies are satisfied', () => {
      const executor = new HandlerExecutor();
      const result = executor.validateDependencies(['env', 'params', 'command']);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should report missing dependencies', () => {
      const executor = new HandlerExecutor();
      const result = executor.validateDependencies(['params', 'command']);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Handler 'params' depends on 'env' which is not available");
    });

    test('should not check dependencies for handlers not in the list', () => {
      const executor = new HandlerExecutor();
      const result = executor.validateDependencies(['env']);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('isRequired', () => {
    test('should return true for command handler', () => {
      const executor = new HandlerExecutor();
      expect(executor.isRequired('command')).toBe(true);
    });

    test('should return false for optional handlers', () => {
      const executor = new HandlerExecutor();
      expect(executor.isRequired('params')).toBe(false);
      expect(executor.isRequired('help')).toBe(false);
      expect(executor.isRequired('env')).toBe(false);
    });

    test('should return false for unknown handler', () => {
      const executor = new HandlerExecutor();
      expect(executor.isRequired('unknown')).toBe(false);
    });
  });

  describe('getHandler', () => {
    test('should return handler definition by name', () => {
      const executor = new HandlerExecutor();
      const handler = executor.getHandler('env');
      
      expect(handler).toBeDefined();
      expect(handler?.name).toBe('env');
      expect(handler?.executionOrder).toBe(EXECUTION_ORDER.ENV);
    });

    test('should return undefined for unknown handler', () => {
      const executor = new HandlerExecutor();
      const handler = executor.getHandler('unknown');
      
      expect(handler).toBeUndefined();
    });
  });

  describe('buildContext', () => {
    test('should build context with env handler', async () => {
      const executor = new HandlerExecutor();
      const initialContext: Context<any> = {
        args: [],
        options: {},
        env: process.env,
        command: 'test',
      };
      
      const envHandler = async (ctx: Context<any>) => ({ NODE_ENV: 'test' });
      const loadedHandlers = new Map<string, LoadedHandler>([
        ['env', {
          definition: executor.getHandler('env')!,
          handler: envHandler,
        }],
      ]);
      
      const result = await executor.buildContext(initialContext, loadedHandlers);
      
      expect(result.env).toEqual({ NODE_ENV: 'test' });
    });

    test('should build context with multiple handlers', async () => {
      const executor = new HandlerExecutor();
      const initialContext: Context<any> = {
        args: [],
        options: {},
        env: process.env,
        command: 'test',
      };
      
      const envHandler = async (ctx: Context<any>) => ({ NODE_ENV: 'test' });
      const versionHandler = async (ctx: Context<any>) => ({ version: '1.0.0' });
      const paramsHandler = async (ctx: Context<any>) => ({ 
        schema: {}, 
        mappings: [] 
      });
      
      const loadedHandlers = new Map<string, LoadedHandler>([
        ['env', {
          definition: executor.getHandler('env')!,
          handler: envHandler,
        }],
        ['version', {
          definition: executor.getHandler('version')!,
          handler: versionHandler,
        }],
        ['params', {
          definition: executor.getHandler('params')!,
          handler: paramsHandler,
        }],
      ]);
      
      const result = await executor.buildContext(initialContext, loadedHandlers);
      
      expect(result.env).toEqual({ NODE_ENV: 'test' });
      expect(result.version).toEqual({ version: '1.0.0' });
      expect(result.params).toEqual({ schema: {}, mappings: [] });
    });

    test('should handle middleware and global-error handlers', async () => {
      const executor = new HandlerExecutor();
      const initialContext: Context<any> = {
        args: [],
        options: {},
        env: process.env,
        command: 'test',
      };
      
      const middlewareHandler = async () => {};
      const globalErrorHandler = async (error: unknown) => {};
      
      const loadedHandlers = new Map<string, LoadedHandler>([
        ['middleware', {
          definition: executor.getHandler('middleware')!,
          handler: middlewareHandler,
        }],
        ['global-error', {
          definition: executor.getHandler('global-error')!,
          handler: globalErrorHandler,
        }],
      ]);
      
      const result = await executor.buildContext(initialContext, loadedHandlers);
      
      expect(result.hasMiddleware).toBe(true);
      expect(result.globalErrorHandler).toBe(globalErrorHandler);
    });

    test('should throw error if handler execution fails', async () => {
      const executor = new HandlerExecutor();
      const initialContext: Context<any> = {
        args: [],
        options: {},
        env: process.env,
        command: 'test',
      };
      
      const failingHandler = async () => {
        throw new Error('Handler failed');
      };
      
      const loadedHandlers = new Map<string, LoadedHandler>([
        ['env', {
          definition: executor.getHandler('env')!,
          handler: failingHandler,
        }],
      ]);
      
      await expect(executor.buildContext(initialContext, loadedHandlers))
        .rejects
        .toThrow("Failed to execute handler 'env': Handler failed");
    });
  });

  describe('getAllHandlers', () => {
    test('should return all handler definitions', () => {
      const executor = new HandlerExecutor();
      const handlers = executor.getAllHandlers();
      
      expect(handlers.length).toBe(8);
      expect(handlers.map(h => h.name).sort()).toEqual([
        'command',
        'env',
        'error',
        'global-error',
        'help',
        'middleware',
        'params',
        'version',
      ]);
    });
  });
});