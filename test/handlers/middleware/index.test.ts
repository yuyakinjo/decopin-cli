import { describe, it, expect } from 'bun:test';
import { createMiddlewareHandler, executeMiddleware } from '../../../src/handlers/middleware/index.js';
import type { MiddlewareDefinition } from '../../../src/handlers/middleware/types.js';

describe('Middleware Handler', () => {
  describe('createMiddlewareHandler', () => {
    it('should create a middleware handler', () => {
      const definition: MiddlewareDefinition = {
        name: 'test-middleware',
        handler: async (context, next) => {
          context.middlewareExecuted = true;
          return next();
        }
      };

      const handler = createMiddlewareHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.execute).toBe('function');
    });

    it('should execute middleware in sequence', async () => {
      const executionOrder: string[] = [];

      const middleware1: MiddlewareDefinition = {
        name: 'middleware-1',
        handler: async (context, next) => {
          executionOrder.push('before-1');
          const result = await next();
          executionOrder.push('after-1');
          return result;
        }
      };

      const middleware2: MiddlewareDefinition = {
        name: 'middleware-2',
        handler: async (context, next) => {
          executionOrder.push('before-2');
          const result = await next();
          executionOrder.push('after-2');
          return result;
        }
      };

      const handler1 = createMiddlewareHandler(middleware1);
      const handler2 = createMiddlewareHandler(middleware2);

      const mockContext = {};
      const finalHandler = async () => {
        executionOrder.push('final');
        return 'result';
      };

      await executeMiddleware([handler1, handler2], mockContext, finalHandler);

      expect(executionOrder).toEqual([
        'before-1',
        'before-2',
        'final',
        'after-2',
        'after-1'
      ]);
    });
  });

  describe('executeMiddleware', () => {
    it('should execute empty middleware chain', async () => {
      const mockContext = {};
      const finalHandler = async () => 'result';

      const result = await executeMiddleware([], mockContext, finalHandler);
      expect(result).toBe('result');
    });

    it('should handle middleware errors', async () => {
      const errorMiddleware: MiddlewareDefinition = {
        name: 'error-middleware',
        handler: async () => {
          throw new Error('Middleware error');
        }
      };

      const handler = createMiddlewareHandler(errorMiddleware);
      const mockContext = {};
      const finalHandler = async () => 'result';

      await expect(
        executeMiddleware([handler], mockContext, finalHandler)
      ).rejects.toThrow('Middleware error');
    });
  });
});