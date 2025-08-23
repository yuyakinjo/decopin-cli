---
inclusion: always
---

# Product Overview

**decopin-cli** is a TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. It enables developers to create powerful command-line interfaces with zero configuration using familiar file-based conventions and pre-validated, type-safe command contexts.

## Core Principles

- **Convention over Configuration**: Follow Next.js-style file-based routing patterns
- **Type Safety First**: All command contexts must be fully typed and validated
- **Lazy Loading**: Only load modules when commands are executed
- **Zero Boilerplate**: Minimize setup code through intelligent defaults
- **Factory Pattern**: All handlers use factory functions for dependency injection

## File-Based Command Structure

Commands follow a strict file-based routing convention in the `app/` directory:

- `command.ts` - Required handler that exports default factory function
- `params.ts` - Optional parameter validation using valibot schemas
- `help.ts` - Optional help documentation factory
- `error.ts` - Optional custom error handling factory
- Nested folders create command hierarchies (e.g., `user/create/` → `cli user create`)

## Development Patterns

### Command Handler Pattern

```typescript
// Always export default factory function
export default function createHandler(context: CommandContext) {
  return async (params: ValidatedParams) => {
    // Command logic here
  };
}
```

### Parameter Validation Pattern

```typescript
// Use valibot for schema validation
import { object, string } from 'valibot';

export const schema = object({
  name: string(),
  // ... other params
});
```

### Context-First Design

- Commands receive pre-validated, type-safe contexts
- No manual validation needed in command handlers
- Context includes parsed params, environment, and metadata

## Performance Requirements

- **Startup Time**: CLI must load in <100ms for simple commands
- **Memory Usage**: Lazy loading prevents loading unused command modules
- **Build Time**: TypeScript compilation should be incremental and fast

## Code Quality Standards

- All handlers must be async functions
- Use TypeScript strict mode with full type coverage
- Follow factory pattern for all handler exports
- Prefer composition over inheritance
- Use valibot for all validation schemas

## Target Developer Experience

Developers should be able to:

1. Create new commands by adding files to `app/` directory
2. Get full TypeScript IntelliSense for command contexts
3. Run commands immediately without build steps during development
4. Deploy CLIs as single executable files
