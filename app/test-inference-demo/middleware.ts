import type { 
  MiddlewareHandler, 
  MiddlewareContext, 
  NextFunction, 
  MiddlewareFactoryContext 
} from '../../dist/types/index.js';

// Middleware with factory context
export default function createMiddleware(
  context: MiddlewareFactoryContext<typeof process.env>
): MiddlewareHandler {
  // Access environment during middleware creation
  const isProduction = context.env.NODE_ENV === 'production';
  const debugEnabled = context.env.DEBUG === 'true';
  
  return async (middlewareContext: MiddlewareContext, next: NextFunction) => {
    // Log command execution in debug mode
    if (debugEnabled) {
      console.log(`[${new Date().toISOString()}] Executing command:`, middlewareContext.command);
      console.log('Args:', middlewareContext.args);
      console.log('Options:', middlewareContext.options);
    }
    
    // Add authentication in production
    if (isProduction && !middlewareContext.env.AUTH_TOKEN) {
      console.error('Error: AUTH_TOKEN required in production');
      process.exit(1);
    }
    
    // Performance monitoring
    const startTime = performance.now();
    
    try {
      // Execute the command
      await next();
      
      // Log execution time
      if (debugEnabled) {
        const duration = performance.now() - startTime;
        console.log(`[Performance] Command completed in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      // Log errors with context
      if (debugEnabled) {
        console.error('[Error] Command failed:', error);
        console.error('Context:', {
          command: middlewareContext.command,
          args: middlewareContext.args,
          options: middlewareContext.options
        });
      }
      throw error;
    }
  };
}