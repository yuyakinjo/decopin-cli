# Global Error Handler

decopin-cli supports a global error handler that catches errors from commands without custom error handlers. This is inspired by Next.js's `global-error.tsx` and provides a centralized way to handle uncaught errors.

## Overview

The global error handler acts as a fallback when:
- A command doesn't have its own `error.ts` file
- An unexpected error occurs during command execution
- Validation fails and there's no command-specific error handler

## Creating a Global Error Handler

Create a `global-error.ts` file in your app root directory:

```typescript
// app/global-error.ts
import type { GlobalErrorHandler, CLIError } from 'decopin-cli';
import { isValidationError, isModuleError, hasStackTrace } from 'decopin-cli';

export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    // Your error handling logic here
    console.error('An error occurred:', error.message);
    process.exit(1);
  };
}
```

## Error Types

The global error handler receives a `CLIError` which can be one of several types:

### ValidationError
Errors from Valibot validation with an `issues` array:

```typescript
if (isValidationError(error)) {
  error.issues.forEach((issue) => {
    const path = issue.path?.map(p => p.key).join('.') || 'value';
    console.error(`Validation error at ${path}: ${issue.message}`);
  });
}
```

### ModuleError
Node.js module loading errors with an error `code`:

```typescript
if (isModuleError(error)) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('Required module not found');
  }
  console.error(error.message);
}
```

### Standard Error
Regular JavaScript errors:

```typescript
if (error instanceof Error) {
  console.error('Error:', error.message);
  if (hasStackTrace(error)) {
    console.error('Stack:', error.stack);
  }
}
```

## Type Guards

decopin-cli provides type guard functions for safe error handling:

- `isValidationError(error)` - Check if error has validation issues
- `isModuleError(error)` - Check if error is a module loading error
- `hasStackTrace(error)` - Check if error has a stack trace

## Complete Example

Here's a comprehensive global error handler that handles all error types:

```typescript
import type { GlobalErrorHandler, CLIError } from 'decopin-cli';
import { isValidationError, isModuleError, hasStackTrace } from 'decopin-cli';

export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    console.error('\n❌ An error occurred\n');

    // Handle different error types
    if (isValidationError(error)) {
      console.error('📋 Validation Error:');
      error.issues.forEach((issue) => {
        const path = issue.path?.map(p => p.key).join('.') || 'value';
        console.error(`  • ${path}: ${issue.message}`);
      });
    } else if (isModuleError(error) && error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('📦 Module Error:');
      console.error('  The required module could not be found.');
      console.error(`  ${error.message}`);
    } else if (error instanceof Error) {
      console.error('💥 Error Details:');
      console.error(`  ${error.message}`);
    } else {
      console.error('🔥 Unknown Error:');
      console.error(error);
    }

    // Show stack trace in debug mode
    if ((process.env.DEBUG || process.env.CLI_DEBUG) && hasStackTrace(error)) {
      console.error('\n📍 Stack Trace:');
      console.error(error.stack);
    }

    // Helpful tips based on error type
    console.error('\n💡 Tips:');
    if (isValidationError(error)) {
      console.error('  • Check your input values against the required format');
      console.error('  • Use --help to see parameter details');
    } else if (isModuleError(error)) {
      console.error('  • Ensure all required files are present');
      console.error('  • Check your project structure');
    } else {
      console.error('  • Check your command syntax');
      console.error('  • Use --help to see available options');
    }
    console.error('  • Set DEBUG=true for more details');

    process.exit(1);
  };
}
```

## Error Handler Priority

The error handling follows this priority order:

1. **Command-specific error.ts** (highest priority)
   - Located in the same directory as the command
   - Handles errors specific to that command

2. **Global error.ts** (fallback)
   - Located in the app root directory
   - Handles errors from any command without its own error handler

3. **Default error handler** (last resort)
   - Built-in minimal error display
   - Used when no custom handlers are available

## Use Cases

### Centralized Error Formatting
Ensure consistent error messages across your entire CLI:

```typescript
export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error in ${process.argv.slice(2).join(' ')}`);
    
    // Your formatting logic
  };
}
```

### Error Reporting
Send errors to monitoring services:

```typescript
export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    // Log to file
    await fs.appendFile('error.log', `${new Date().toISOString()}: ${error.message}\n`);
    
    // Send to monitoring service
    if (process.env.SENTRY_DSN) {
      await reportToSentry(error);
    }
    
    // Display user-friendly message
    console.error('An error occurred. This has been reported.');
    process.exit(1);
  };
}
```

### Environment-Specific Handling
Different error handling for development vs production:

```typescript
export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    if (process.env.NODE_ENV === 'development') {
      // Detailed error info for developers
      console.error('Development Error:', error);
      if (hasStackTrace(error)) {
        console.error(error.stack);
      }
    } else {
      // User-friendly message in production
      console.error('An unexpected error occurred.');
      console.error('Please try again or contact support.');
    }
    
    process.exit(1);
  };
}
```

## Best Practices

1. **Always call `process.exit(1)`** - Ensure the CLI exits with an error code
2. **Use type guards** - Leverage the provided type guards for safe error handling
3. **Provide helpful messages** - Give users actionable error messages
4. **Support debug mode** - Show detailed info when DEBUG environment variable is set
5. **Keep it lightweight** - Global error handler runs for many errors, so keep it fast

## Testing

You can test your global error handler by creating a command that throws errors:

```typescript
// app/test-error/command.ts
export default async function createCommand() {
  const errorType = process.argv[3];
  
  if (errorType === 'validation') {
    const error = new Error('Validation failed') as any;
    error.issues = [{ path: [{ key: 'test' }], message: 'Test validation error' }];
    throw error;
  }
  
  throw new Error('Test runtime error');
}
```

Then run:
```bash
# Test validation error handling
my-cli test-error validation

# Test runtime error handling
my-cli test-error

# Test with debug mode
DEBUG=true my-cli test-error
```