# Middleware Support

decopin-cli supports Next.js-style middleware that runs before every command execution. This allows you to implement cross-cutting concerns like authentication, logging, and error handling in one place.

## Creating Middleware

Create a `middleware.ts` file in your app root directory:

```typescript
// app/middleware.ts
import type { MiddlewareFactory, MiddlewareContext, NextFunction } from '../dist/types/middleware.js';

export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    // Pre-execution logic
    console.log(`Executing: ${context.command}`);
    
    // Call the next middleware or command
    await next();
    
    // Post-execution logic
    console.log('Command completed');
  };
}
```

## Middleware Context

The middleware receives a context object with:

- `command`: Command path as a string (e.g., `'user/create'`)
- `args`: Positional arguments passed to the command
- `options`: Named options as key-value pairs (e.g., `{ name: 'value', auth: true }`)
- `env`: Environment variables (typed as `typeof process.env` or custom type)

## Use Cases

### Authentication

```typescript
export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    // Check if --auth flag is provided
    if (context.options.auth) {
      const token = context.env.AUTH_TOKEN;
      if (!token) {
        console.error('❌ Authentication required. Set AUTH_TOKEN environment variable.');
        process.exit(1);
      }
      console.log('✅ Authenticated');
    }
    await next();
  };
}
```

### Performance Monitoring

```typescript
export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`Command executed in ${duration}ms`);
  };
}
```

### Error Handling

```typescript
export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    try {
      await next();
    } catch (error: any) {
      // Custom error handling
      if (error.code === 'NETWORK_ERROR') {
        console.error('Network connection failed. Please check your internet.');
      } else {
        console.error('Command failed:', error.message);
      }
      process.exit(1);
    }
  };
}
```

## Testing with Middleware

For testing, you can control middleware behavior using environment variables:

```typescript
export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    // Skip middleware in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    
    // Normal middleware logic
    console.log(`[${new Date().toISOString()}] ${context.command}`);
    await next();
  };
}
```

## Complete Example

Here's a comprehensive middleware example that combines multiple features:

```typescript
import type { MiddlewareFactory, MiddlewareContext, NextFunction } from '../dist/types/middleware.js';

const createMiddleware: MiddlewareFactory = () => {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    const startTime = Date.now();
    
    // Debug logging
    if (context.env.CLI_DEBUG === 'true') {
      console.log(`[DEBUG] Command: ${context.command}`);
      console.log(`[DEBUG] Args:`, context.args);
      console.log(`[DEBUG] Options:`, context.options);
    }
    
    // Authentication check
    if (context.options.auth) {
      const token = context.env.AUTH_TOKEN;
      if (!token) {
        console.error('❌ Authentication required. Set AUTH_TOKEN environment variable.');
        process.exit(1);
      }
      console.log('✅ Authenticated');
    }
    
    try {
      await next();
      
      // Performance logging
      const duration = Date.now() - startTime;
      if (context.env.CLI_DEBUG === 'true') {
        console.log(`[DEBUG] Command completed in ${duration}ms`);
      }
    } catch (error: any) {
      // Enhanced error handling
      console.error('\n❌ Command failed');
      
      if (context.env.CLI_DEBUG === 'true') {
        console.error('[DEBUG] Error details:', error);
      } else {
        console.error(`Error: ${error.message}`);
      }
      
      process.exit(1);
    }
  };
};

export default createMiddleware;
```

## Middleware Type Definitions

```typescript
// Types from decopin-cli
export interface MiddlewareContext<Env = Record<string, string | undefined>> {
  command: string;  // Command path (e.g., 'user/create')
  args: string[];   // Positional arguments
  options: Record<string, string | boolean>;  // CLI options
  env: Env;        // Environment variables
}

export type NextFunction = () => Promise<void>;
export type MiddlewareHandler<Env = Record<string, string | undefined>> = 
  (context: MiddlewareContext<Env>, next: NextFunction) => Promise<void>;
export type MiddlewareFactory<Env = Record<string, string | undefined>> = 
  () => MiddlewareHandler<Env>;
```

## Best Practices

1. **Keep middleware lightweight** - Avoid heavy computations that slow down every command
2. **Use environment variables** - Control middleware behavior through env vars for flexibility
3. **Handle errors gracefully** - Always wrap `next()` in try-catch for global error handling
4. **Type your environment** - Use generic types for better TypeScript support with environment variables
5. **Debug mode** - Implement a debug mode for troubleshooting middleware behavior