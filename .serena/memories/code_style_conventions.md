# Code Style and Conventions for decopin-cli

## TypeScript Configuration
- **Strict Mode**: Enforced with all strict checks enabled
- **Target**: ES2022
- **Module**: ESNext with Node module resolution
- **No Any Types**: `noExplicitAny` is set to warn (should avoid using `any`)
- **No Implicit Returns**: All code paths must return a value
- **No Unused Variables**: Both locals and parameters must be used

## Code Formatting (Biome)
- **Indentation**: 2 spaces
- **Line Width**: 80 characters
- **Quotes**: Single quotes for strings
- **Semicolons**: Always required
- **Trailing Commas**: ES5 style (in arrays/objects)
- **Arrow Parentheses**: Always required
- **Bracket Spacing**: True (spaces inside brackets)
- **Line Endings**: LF (Unix style)

## Coding Guidelines
1. **Use `const` over `let`**: Prefer immutability
2. **Function Length**: Keep functions under 150 lines
3. **No `any` types**: Use proper typing with generics or specific interfaces
4. **Import Style**: Use destructuring when possible
5. **Async Functions**: All command handlers must be async functions
6. **Object Extension**: Use `Object.assign()` instead of type assertions

## Command Handler Patterns
All handlers follow a consistent context-based pattern:

### Command Handler
```typescript
export default async function createCommand(context: CommandContext<T>) {
  const { validatedData, args, env, options } = context;
  // Direct command implementation
}
```

### Params Handler
```typescript
export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    mappings: [...] // or schema: ...
  };
}
```

### Error Handler
```typescript
export default async function createErrorHandler(context: ErrorContext<T>) {
  const { error, validatedData, args, env } = context;
  // Custom error handling
  process.exit(1);
}
```

## File Naming Conventions
- **Commands**: `app/command-name/command.ts`
- **Parameters**: `app/command-name/params.ts`
- **Error Handlers**: `app/command-name/error.ts`
- **Help**: `app/command-name/help.ts`
- **Global Files**: `app/middleware.ts`, `app/global-error.ts`, `app/version.ts`

## Testing Conventions
- Unit tests in `test/` directory
- Each module should have a corresponding test file
- Test both success and error cases
- Mock file system operations when needed
- Integration tests in `test/integration/`

## Comments and Documentation
- **NO COMMENTS** in code unless explicitly requested
- Use clear, self-documenting code
- Type definitions should be descriptive
- README and documentation files only when requested

## Export Patterns
- Always use default exports for handler functions
- Export types separately when needed
- Factory pattern for all handlers (functions returning definitions)