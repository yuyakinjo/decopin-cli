# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**decopin-cli** is a TypeScript-first CLI builder that uses Next.js App Router-inspired file-based routing to create command-line interfaces with zero configuration. Commands are defined as functions that receive pre-validated data through a type-safe context.

## Essential Commands

### Development Workflow
```bash
# Main development command - starts build + watch mode
npm run dev

# Run tests
npm test                   # Run all tests once
npm run test:watch        # Watch mode for TDD
vitest run test/parser    # Run specific test directory

# Code quality
npm run lint             # Check code with Biome

# Build commands
npm run build           # Build library (src/ → dist/)
npm run build:app       # Build example app (app/ → examples/)
npm run dev:regen       # Regenerate CLI after changes
```

### Testing Generated CLI
```bash
# After building, test your commands:
node examples/cli.js hello "World"
node examples/cli.js user create --name "John" --email "john@example.com"
```

### Environment Variables Type Generation
The project automatically generates TypeScript types from your `app/env.ts` file:

```bash
npm run generate:env-types  # Manually generate types
npm run build              # Types are auto-generated during build
```

**How it works:**
1. Define your environment schema in `app/env.ts`:
   ```typescript
   const envSchema = {
     NODE_ENV: { type: SCHEMA_TYPE.STRING, ... },
     API_KEY: { type: SCHEMA_TYPE.STRING, ... },
     // ...
   } as const;
   ```

2. Types are auto-generated to `app/generated/env-types.ts`:
   ```typescript
   export interface AppEnv {
     NODE_ENV: string;
     API_KEY: string;
     // ...
   }
   ```

3. Import and use the generated type:
   ```typescript
   import type { AppEnv } from './generated/env-types.js';
   ```

**Note:** The `app/generated/` directory is ignored by the file watcher to prevent build loops.

## High-Level Architecture

### Core Library Structure (`src/`)
The library implements a pipeline that transforms file-based commands into a working CLI:

1. **Scanner** (`src/scanner/`) - Discovers command files in the `app/` directory and detects middleware
2. **Parser** (`src/parser/`) - Uses TypeScript AST to extract metadata from command files
3. **Generator** (`src/generator/`) - Creates the final CLI with dynamic imports, validation, and middleware support
4. **Types** (`src/types/`) - Comprehensive TypeScript definitions for the entire system
5. **Middleware** (`src/types/middleware.ts`, `src/generator/middleware-template.ts`) - Global middleware support for cross-cutting concerns

### Command Architecture Pattern
Commands follow a simple async function pattern where validation and business logic are separated. All handlers follow a consistent context-based pattern:

```typescript
// params.ts - Validation and type definitions
import type { ParamsHandler, Context } from 'decopin-cli';

export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    schema: ValibotSchema,        // Runtime validation
    mappings: [...]              // CLI argument mapping
  };
}

// command.ts - Pre-validated command implementation
import type { CommandContext } from 'decopin-cli';

export default async function createCommand(context: CommandContext<T>) {
  const data = context.validatedData;  // Already validated!
  // Implementation directly in function body
}

// error.ts - Custom error handling (optional)
import type { ErrorContext, ErrorHandler } from 'decopin-cli';

export default async function createErrorHandler(context: ErrorContext<T>): Promise<ErrorHandler> {
  const { error } = context;
  // Custom error handling logic
  process.exit(1);
}
```

### Key Design Principles

1. **Parse, Don't Validate**: All inputs are parsed into type-safe structures using valibot schemas. Never use boolean validation - always transform inputs into proper types.

2. **Type Safety Throughout**: The entire pipeline maintains type safety from CLI arguments through validation to command execution. Commands receive `CommandContext<T>` with pre-validated data.

3. **Zero Configuration**: Commands work without any configuration files. The file structure itself defines the CLI structure.

4. **Dynamic Import Strategy**: Generated CLIs use dynamic imports for lazy loading, enabling fast startup times regardless of command count.

5. **Simple Function Pattern**: Commands are async functions that directly execute logic, not factories that return handlers.

## Development Guidelines

### When Adding New Features
1. Always maintain backward compatibility with existing command structures
2. Use valibot for all validation - follow the "Parse, Don't Validate" principle
3. Keep the factory pattern for commands (functions returning command definitions)
4. Ensure all new code has corresponding tests

### File Watching and Auto-Regeneration
The project uses `mise` for file watching. When `npm run dev` is running:
- Changes to `src/**/*.ts` trigger library rebuild
- Changes to `app/**/*.ts` trigger example rebuild + CLI regeneration
- Import paths are automatically fixed (`../app/` → `../examples/`)

### Testing Strategy
- Unit tests for all utilities and parsers in `test/`
- Each module should have a corresponding test file
- Test both success and error cases
- Mock file system operations when needed

### Code Style Requirements
- TypeScript strict mode is enforced
- Use `const` over `let`
- Functions should be under 150 lines
- **No `any` types** - use proper typing with generics or specific interfaces
- Import with destructuring when possible
- All command handlers must be async functions that accept `CommandContext<T>`
- Use `Object.assign()` instead of type assertions when extending objects

### Handler Registry System

The project uses a unified handler registry system to manage all handler types and their execution order:

```typescript
// src/types/handler-registry.ts
export interface HandlerDefinition {
  name: string;                    // Handler name (e.g., 'command', 'params')
  fileName: string;                // Expected file name (e.g., 'command.ts')
  handlerType: string;             // Handler type identifier
  contextType: string;             // Expected context type
  executionOrder: number;          // Numeric execution priority
  scope: HandlerScope;             // 'global' or 'command'
  required: boolean;               // Whether handler is required
  dependencies?: string[];         // Other handlers this depends on
  description?: string;            // Human-readable description
}
```

**Key Features:**
- **Centralized Management**: All handler types defined in one place
- **Execution Order**: Handlers execute based on `executionOrder` value (lower = earlier)
- **Dependency Validation**: Ensures required handlers are present
- **Type Safety**: Each handler has defined context types
- **Extensibility**: Easy to add new handler types

**Handler Execution Order:**
1. **global-error** (0): Global error handling setup
2. **env** (100): Environment variable loading/validation
3. **version** (200): Version information
4. **middleware** (300): Middleware setup
5. **help** (400): Help information
6. **params** (500): Parameter validation
7. **command** (1000): Command execution
8. **error** (1100): Command-specific error handling

**Using the Registry:**
```typescript
import { HandlerExecutor } from 'decopin-cli';

const executor = new HandlerExecutor();
const handlers = executor.getExecutionOrder('command'); // Get command-scoped handlers
const validation = executor.validateDependencies(['command', 'params']); // Check deps
```

### Middleware Architecture

The middleware system allows for global cross-cutting concerns to be handled before and after command execution:

```typescript
// app/middleware.ts - Global middleware
import type { MiddlewareFactory, MiddlewareContext, NextFunction, Context } from '../dist/types/middleware.js';

export default function createMiddleware(context: Context<typeof process.env>): MiddlewareFactory {
  return async (context: MiddlewareContext, next: NextFunction) => {
    // Pre-execution logic
    console.log(`[${new Date().toISOString()}] Executing: ${context.command}`);

    try {
      await next(); // Execute the command
    } catch (error) {
      // Global error handling
      console.error(`Command failed: ${error.message}`);
      throw error;
    }
  };
}
```

**Key Middleware Concepts:**
- **Factory Pattern**: Middleware files export a factory function that returns the actual handler
- **Context Object**: Contains command path, args, options, and environment variables
- **Next Function**: Call `next()` to proceed to the command execution
- **Error Handling**: Wrap `next()` in try-catch for global error handling
- **Pre/Post Processing**: Add logic before and after `next()` for cross-cutting concerns

**Common Middleware Patterns:**
1. **Authentication**: Check auth tokens from environment or options
2. **Logging/Debugging**: Log command execution with timestamps
3. **Performance Monitoring**: Measure execution time
4. **Environment Setup**: Initialize services or validate environment
5. **Request/Response Transformation**: Modify context or results

## Context-Based Architecture

All handlers in decopin-cli follow a consistent context-based pattern, providing a unified interface for accessing command execution information:

### Handler Patterns

1. **Command Handler** (`command.ts`)
   ```typescript
   export default async function createCommand(context: CommandContext<T, E>) {
     const { validatedData, args, env, options } = context;
     // Direct command implementation
   }
   ```

2. **Params Handler** (`params.ts`)
   ```typescript
   export default function createParams(context: Context<E>): ParamsHandler {
     // Can access environment during initialization
     const { env } = context;

     // Either use mappings (recommended for most cases)
     return {
       mappings: [
         {
           field: 'name',
           type: 'string',
           option: 'name',
           argIndex: 0,
           required: true,
           description: 'User name'
         }
       ]
     };

     // OR use schema (for complex validation)
     return {
       schema: v.object({
         name: v.pipe(v.string(), v.minLength(1)),
         email: v.pipe(v.string(), v.email())
       })
     };
   }
   ```

3. **Error Handler** (`error.ts`)
   ```typescript
   export default async function createErrorHandler(context: ErrorContext<T, E>) {
     const { error, validatedData, args, env } = context;
     // Custom error handling with full context
   }
   ```

4. **Middleware Factory** (`middleware.ts`)
   ```typescript
   export default function createMiddleware(context: Context<E>) {
     return async (middlewareContext: MiddlewareContext, next: NextFunction) => {
       // Middleware logic with access to factory context
     };
   }
   ```

5. **Global Error Handler** (`global-error.ts`)
   ```typescript
   export default function createGlobalErrorHandler(context: Context<E>) {
     return async (error: unknown) => {
       // Global error handling with factory context
     };
   }
   ```

### Context Types

- **Context**: Basic context with args, env, command, and options
- **CommandContext**: Extends Context with validatedData
- **ErrorContext**: Extends CommandContext with error property
- **MiddlewareContext**: Used within middleware execution

### Benefits

1. **Consistency**: All handlers follow the same pattern
2. **Type Safety**: Full TypeScript support with generics
3. **Flexibility**: Access to all execution information
4. **Testability**: Easy to mock contexts for testing
5. **Extensibility**: Context can be enhanced with additional properties

## Common Tasks

### Adding a New Command
1. Create directory: `app/your-command/`
2. Add `command.ts` with the command implementation
3. Optionally add `params.ts` for validation
4. Run `npm run dev` to see changes reflected
5. Test with `node examples/cli.js your-command`

### Adding Middleware
1. Create `app/middleware.ts` in the root of your app directory
2. Export a factory function that returns a middleware handler
3. The middleware will automatically be detected and integrated
4. Test that middleware runs before your commands

### Adding Global Error Handler
1. Create `app/global-error.ts` in the root of your app directory
2. Export a factory function that receives context and returns an error handler
3. The handler will catch errors from commands without custom error.ts
4. Use type-safe error handling with provided types and type guards:
   ```typescript
   import type { GlobalErrorHandlerFactory, Context } from 'decopin-cli';
   import { isValidationError, isModuleError, hasStackTrace } from 'decopin-cli';

   export default function createGlobalErrorHandler(context: Context<typeof process.env>) {
     return async (error: unknown) => {
       // Access environment from factory context
       if (context.env.DEBUG) {
         console.error('Stack trace:', error.stack);
       }
       // Handle error
       process.exit(1);
     };
   }
   ```
5. Useful for centralized error formatting, logging, and monitoring

### Adding a New Handler Type

To add a new handler type to the system:

1. **Update Handler Registry** (`src/types/handler-registry.ts`):
   ```typescript
   {
     name: 'new-handler',
     fileName: 'new-handler.ts',
     handlerType: 'NewHandler',
     contextType: 'Context',
     executionOrder: 450,  // Choose appropriate order
     scope: 'command',     // or 'global'
     required: false,
     dependencies: ['params'],  // If depends on other handlers
     description: 'Description of what this handler does'
   }
   ```

2. **Update Types** if needed for the new handler interface

3. **Update Generator** (`src/generator/lazy-cli-template.ts`):
   - Add handler processing in `generateUnifiedCommandExecution`
   - Handle the new handler type in execution flow

4. **Add Tests** for the new handler type

### Debugging Parser Issues
The AST parser in `src/parser/ast-parser.ts` extracts metadata from TypeScript files. If metadata isn't being extracted correctly:
1. Check that exports use `export default function` pattern
2. Ensure proper TypeScript types are used
3. Run tests in `test/parser/` to debug AST parsing

### Modifying the Generated CLI Structure
The CLI generation logic is spread across several generator files:

- `src/generator/lazy-cli-template.ts` - Modern lazy-loading CLI generator with middleware support
- `src/generator/middleware-template.ts` - Middleware integration templates
- `generateCommandImports()` - Dynamic import generation
- `generateCommandTree()` - Command structure building
- `generateMiddlewareWrapper()` - Middleware execution wrapper generation