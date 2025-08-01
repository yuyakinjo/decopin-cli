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

## High-Level Architecture

### Core Library Structure (`src/`)
The library implements a pipeline that transforms file-based commands into a working CLI:

1. **Scanner** (`src/scanner/`) - Discovers command files in the `app/` directory and detects middleware
2. **Parser** (`src/parser/`) - Uses TypeScript AST to extract metadata from command files
3. **Generator** (`src/generator/`) - Creates the final CLI with dynamic imports, validation, and middleware support
4. **Types** (`src/types/`) - Comprehensive TypeScript definitions for the entire system
5. **Middleware** (`src/types/middleware.ts`, `src/generator/middleware-template.ts`) - Global middleware support for cross-cutting concerns

### Command Architecture Pattern
Commands follow a simple async function pattern where validation and business logic are separated:

```typescript
// params.ts - Validation and type definitions
export default function createParams(): ParamsHandler {
  return {
    schema: ValibotSchema,        // Runtime validation
    mappings: [...]              // CLI argument mapping
  };
}

// command.ts - Pre-validated command implementation
export default async function createCommand(context: CommandContext<T>) {
  const data = context.validatedData;  // Already validated!
  // Implementation directly in function body
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

### Middleware Architecture

The middleware system allows for global cross-cutting concerns to be handled before and after command execution:

```typescript
// app/middleware.ts - Global middleware
import type { MiddlewareFactory, MiddlewareContext, NextFunction } from '../dist/types/middleware.js';

export default function createMiddleware(): MiddlewareFactory {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
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
2. Export a factory function that returns an error handler
3. The handler will catch errors from commands without custom error.ts
4. Use type-safe error handling with provided types and type guards:
   ```typescript
   import type { GlobalErrorHandler, CLIError } from 'decopin-cli';
   import { isValidationError, isModuleError, hasStackTrace } from 'decopin-cli';
   ```
5. Useful for centralized error formatting, logging, and monitoring

### Debugging Parser Issues
The AST parser in `src/parser/ast-parser.ts` extracts metadata from TypeScript files. If metadata isn't being extracted correctly:
1. Check that exports use `export default function` pattern
2. Ensure proper TypeScript types are used
3. Run tests in `test/parser/` to debug AST parsing

### Modifying the Generated CLI Structure
The CLI generation logic is spread across several generator files:
- `src/generator/cli-generator.ts` - Main CLI template generation (deprecated)
- `src/generator/lazy-cli-template.ts` - Modern lazy-loading CLI generator with middleware support
- `src/generator/middleware-template.ts` - Middleware integration templates
- `generateCommandImports()` - Dynamic import generation
- `generateCommandTree()` - Command structure building
- `generateMiddlewareWrapper()` - Middleware execution wrapper generation