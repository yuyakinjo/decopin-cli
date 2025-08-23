---
inclusion: always
---

# Project Structure & File Conventions

## Critical File Placement Rules

**NEVER modify auto-generated directories:**

- `examples/` - Build output from `app/`, changes overwritten
- `dist/` - Compiled library output
- `app/generated/` - Generated TypeScript types

**Always work in:**

- `src/` - Library source code
- `app/` - CLI commands (file-based routing)
- `test/` - Test files

## File-Based Routing Structure

Commands map to filesystem paths in `app/`:

```text
app/hello/command.ts        → cli hello
app/user/create/command.ts  → cli user create
app/user/list/command.ts    → cli user list
```

### Handler Files (per command directory)

- `command.ts` - **REQUIRED**: Main handler (factory function)
- `params.ts` - Optional: valibot validation schema
- `help.ts` - Optional: Help documentation (factory function)
- `error.ts` - Optional: Custom error handler (factory function)

### Root-Level Files (app/)

- `version.ts` - **REQUIRED**: CLI version
- `env.ts` - Optional: Environment schema
- `middleware.ts` - Optional: Global middleware
- `global-error.ts` - Optional: Global error handler

## Mandatory Factory Pattern

ALL handlers MUST export default factory functions:

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

## File Naming Rules

- Command directories: kebab-case (`user-management/`)
- Handler files: exact names (`command.ts`, `params.ts`, `help.ts`, `error.ts`)
- Never use `index.ts` files in command directories
- Use `.js` extensions in imports for ESM compatibility

## Import Path Conventions

```typescript
// Relative imports with .js extensions
import type { CommandContext } from '../../../src/types/context.js';
import { object, string } from 'valibot';
```

## Command Development Workflow

1. Create command directory in `app/` (e.g., `app/deploy/`)
2. Add `command.ts` with factory function
3. Add `params.ts` with valibot schema (if parameters needed)
4. Add `help.ts` for documentation (optional)
5. Test with `npm run dev`

## Key Architecture Rules

- Commands receive pre-validated contexts - no manual validation needed
- All command handlers must be async functions
- Use valibot exclusively for parameter schemas
- Lazy loading - commands loaded only when executed
- TypeScript strict mode required
