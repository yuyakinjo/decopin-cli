# Middleware Support

decopin-cli supports Next.js-style middleware that runs before every command execution. This allows you to implement cross-cutting concerns like authentication, logging, and error handling in one place.

## Creating Middleware

Create a `middleware.ts` file in your app root directory:

```typescript
// app/middleware.ts
import type { MiddlewareHandler } from 'decopin-cli';

export default function createMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    // Pre-execution logic
    console.log(`Executing: ${context.command.join(' ')}`);
    
    // Call the next middleware or command
    await next();
    
    // Post-execution logic
    console.log('Command completed');
  };
}
```

## Middleware Context

The middleware receives a context object with:

- `command`: Array of command parts (e.g., `['user', 'create']`)
- `args`: Positional arguments passed to the command
- `options`: Named options (e.g., `--name value`)
- `env`: Environment variables

## Use Cases

### Authentication

```typescript
export default function createMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    if (context.options.protected) {
      const token = context.env.API_TOKEN;
      if (!token || !isValidToken(token)) {
        console.error('Invalid or missing API token');
        process.exit(1);
      }
    }
    await next();
  };
}
```

### Performance Monitoring

```typescript
export default function createMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    console.log(`Command executed in ${duration}ms`);
  };
}
```

### Error Handling

```typescript
export default function createMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
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
export default function createMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    // Skip middleware in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    
    // Normal middleware logic
    console.log(`[${new Date().toISOString()}] ${context.command.join(' ')}`);
    await next();
  };
}
```

## Example

See `app/middleware.example.ts` for a complete example that you can rename to `middleware.ts` to enable.