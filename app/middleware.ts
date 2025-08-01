import type { MiddlewareHandler, MiddlewareContext, NextFunction } from '../src/types/middleware.js';
import type { BaseContext } from '../src/types/context.js';

/**
 * Example middleware file - rename to middleware.ts to enable
 *
 * Middleware runs once before any command execution and can:
 * - Add authentication/authorization
 * - Log command execution
 * - Set up global error handlers
 * - Measure performance
 * - Modify context before command execution
 */
export default function createMiddleware(context: BaseContext<typeof process.env>): MiddlewareHandler {
  return async (context: MiddlewareContext, next: NextFunction) => {
    // Example 1: Logging
    if (context.env.CLI_DEBUG) {
      console.log(`[Debug] Command: ${context.command.join(' ')}`);
      console.log(`[Debug] Args: ${JSON.stringify(context.args)}`);
      console.log(`[Debug] Options: ${JSON.stringify(context.options)}`);
    }

    // Example 2: Authentication
    if (context.options.auth || process.env.REQUIRE_AUTH) {
      const token = context.env.AUTH_TOKEN;
      if (!token) {
        console.error('Error: AUTH_TOKEN environment variable is required');
        process.exit(1);
      }
      // Validate token here...
    }

    // Example 3: Performance monitoring
    const startTime = performance.now();

    try {
      // Call the actual command
      await next();

      // Post-execution: Log success
      if (process.env.CLI_METRICS) {
        const duration = performance.now() - startTime;
        console.log(`[Metrics] Command completed in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      // Global error handling
      if (process.env.CLI_DEBUG) {
        console.error('[Debug] Command failed:', error);
      }
      throw error; // Re-throw to maintain normal error flow
    }
  };
}