---
inclusion: always
---

# decopin-cli: File-Based CLI Framework

TypeScript CLI framework inspired by Next.js App Router with file-based routing and type-safe command contexts.

## File-Based Routing

Commands map to filesystem paths in `app/`:

- `app/hello/command.ts` → `cli hello`
- `app/user/create/command.ts` → `cli user create`
- `app/user/list/command.ts` → `cli user list`

## Command Structure

Each command directory contains:

- `command.ts` - **REQUIRED**: Main handler (factory function)
- `params.ts` - Optional: valibot validation schema
- `help.ts` - Optional: Help documentation (factory function)
- `error.ts` - Optional: Custom error handler (factory function)

## Mandatory Factory Pattern

ALL handlers MUST export default factory functions:

```typescript
// ✅ Required pattern
export default function createHandler(context: CommandContext) {
  return async (params: ValidatedParams) => {
    // Implementation
  };
}

// ❌ Never use direct exports
export const handler = async () => {} // Wrong
```

## Code Templates

### Command Handler

```typescript
import type { CommandContext } from '../../../src/types/context.js';

export default function createHandler(context: CommandContext) {
  return async (params: any) => {
    // Command implementation
    console.log('Command executed');
  };
}
```

### Parameter Schema

```typescript
import { object, string, optional } from 'valibot';

export const schema = object({
  name: string(),
  description: optional(string()),
});
```

### Help Documentation

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

## Development Rules

### Validation & Type Safety

- Use valibot exclusively for schemas
- All handlers receive pre-validated contexts
- No manual parameter validation in handlers
- All handlers must be async functions

### Import Conventions

Use relative imports with `.js` extensions:

```typescript
import type { CommandContext } from '../../../src/types/context.js';
import { validateParams } from '../../utils/validation.js';
```

### Performance Requirements

- Commands loaded lazily (only when executed)
- Use dynamic imports for command modules
- CLI startup must be <100ms for simple commands

## Command Development Workflow

1. Create command directory in `app/` (e.g., `app/deploy/`)
2. Add `command.ts` with factory function
3. Add `params.ts` with valibot schema (if parameters needed)
4. Add `help.ts` for documentation (optional)
5. Test with `npm run dev`
