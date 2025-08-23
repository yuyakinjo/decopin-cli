---
inclusion: always
---

# decopin-cli: TypeScript CLI Builder

A Next.js App Router-inspired CLI framework using file-based routing with zero configuration and type-safe command contexts.

## Critical Architecture Rules

### Factory Pattern (Mandatory)

ALL handlers MUST export default factory functions - never direct exports:

```typescript
// ✅ Correct - Factory function
export default function createHandler(context: CommandContext) {
  return async (params: ValidatedParams) => {
    // Implementation
  };
}

// ❌ Wrong - Direct export
export const handler = async () => {}
```

### File-Based Routing Structure

Commands map to filesystem paths in `app/` directory:

- `app/hello/command.ts` → `cli hello`
- `app/user/create/command.ts` → `cli user create`
- `app/user/list/command.ts` → `cli user list`

### Required Handler Files

- `command.ts` - REQUIRED: Main command handler (factory function)
- `params.ts` - Optional: valibot schema for parameter validation
- `help.ts` - Optional: Help documentation (factory function)
- `error.ts` - Optional: Custom error handler (factory function)

## Code Generation Patterns

### Command Handler Template

```typescript
import type { CommandContext } from '../../../src/types/context.js';

export default function createHandler(context: CommandContext) {
  return async (params: any) => {
    // Command implementation
    console.log('Command executed');
  };
}
```

### Parameter Validation Template

```typescript
import { object, string, optional } from 'valibot';

export const schema = object({
  name: string(),
  description: optional(string()),
});
```

### Help Documentation Template

```typescript
import type { HelpContext } from '../../../src/types/context.js';

export default function createHelp(context: HelpContext) {
  return {
    description: 'Command description',
    examples: [
      'cli command --name value',
      'cli command --name value --description "text"'
    ]
  };
}
```

## Validation & Type Safety Rules

- Use **valibot** exclusively for schemas (never zod/joi)
- All command handlers receive pre-validated contexts
- No manual parameter validation in command handlers
- TypeScript strict mode required
- All handlers must be async functions

## Performance Constraints

- Lazy loading: Commands loaded only when executed
- Startup time: <100ms for simple commands
- Use dynamic imports for command modules
- Avoid importing all commands at startup

## File Modification Rules

**NEVER modify these auto-generated directories:**

- `examples/` - Build output from `app/`
- `dist/` - Compiled library
- `app/generated/` - Generated types

**Always work in:**

- `src/` - Library source code
- `app/` - CLI commands
- `test/` - Test files

## Import Path Conventions

Use relative imports with `.js` extensions for internal modules:

```typescript
import type { CommandContext } from '../../../src/types/context.js';
import { validateParams } from '../../utils/validation.js';
```
