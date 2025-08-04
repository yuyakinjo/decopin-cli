# Type Inference Demo

This directory demonstrates how the improved type definitions provide better type inference and IntelliSense support in decopin-cli.

## Key Improvements

1. **Context Parameter Type Inference**: When you explicitly type handler functions, TypeScript provides full IntelliSense for the context parameter.

2. **Factory Type Definitions**: New factory type interfaces are available for all handler types:
   - `ParamsHandlerFactory`
   - `GlobalErrorHandlerFactory`
   - `EnvHandlerFactory`
   - `VersionHandlerFactory`
   - `HelpHandlerFactory`
   - `MiddlewareHandlerFactory`
   - `ErrorHandlerFactory`
   - `CommandHandlerFactory`

## Usage Examples

### With Context (Recommended Pattern)

```typescript
import type { ParamsContext, ParamsHandler } from 'decopin-cli';

export default function createParams(context: ParamsContext): ParamsHandler {
  // Full type safety and IntelliSense for context
  const isDev = context.env.NODE_ENV === 'development';
  
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        argIndex: 0,
        defaultValue: isDev ? 'dev-user' : 'prod-user'
      }
    ]
  };
}
```

### Without Context

```typescript
import type { ParamsHandler } from 'decopin-cli';

export default function createParams(): ParamsHandler {
  return {
    mappings: [
      { field: 'name', type: 'string', argIndex: 0 }
    ]
  };
}
```

### Command with Validated Data

```typescript
import type { CommandContext } from 'decopin-cli';

interface UserData {
  name: string;
  email: string;
}

export default async function createCommand(
  context: CommandContext<UserData, typeof process.env>
) {
  // context.validatedData is typed as UserData
  const { name, email } = context.validatedData;
  
  // context.env has process.env types
  if (context.env.DEBUG) {
    console.log('Debug mode enabled');
  }
}
```

### Error Handler

```typescript
import type { ErrorContext } from 'decopin-cli';

export default async function createErrorHandler(
  context: ErrorContext<any, typeof process.env>
) {
  const { error } = context;
  console.error('Error occurred:', error);
  process.exit(1);
}
```

## Benefits

1. **Better IntelliSense**: TypeScript provides autocomplete for all context properties
2. **Type Safety**: Catch type errors at compile time
3. **Clear Patterns**: Consistent patterns across all handler types
4. **Flexibility**: Support for both context and no-context handlers