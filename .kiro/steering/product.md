---
inclusion: always
---

# decopin-cli Development Guidelines

**decopin-cli** is a TypeScript-first CLI builder using file-based routing for zero-configuration command-line interfaces.

## Architecture Overview

### File-Based Command Structure

- Commands use folder-based routing in `app/` directory (Next.js App Router pattern)
- Each command requires its own folder: `app/[command-name]/`
- Nested commands supported: `app/user/create/`, `app/user/list/`
- Command discovery is automatic based on folder structure

### Required Files Per Command

- `command.ts` - **REQUIRED**: Default export with `CommandDefinition<T>`
- `params.ts` - **OPTIONAL**: Valibot schema for arguments/options validation
- `help.ts` - **OPTIONAL**: Custom help text override
- `error.ts` - **OPTIONAL**: Custom error handling logic

### Build System

- `app/` → `examples/` (compiled CLI for testing)
- `src/` → `dist/` (library code)
- Generated CLIs use dynamic imports from compiled `examples/`

## Code Templates (Mandatory Patterns)

### Command Implementation (`command.ts`)

```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';

const command: CommandDefinition<DataType> = {
  metadata: {
    name: 'command-name',
    description: 'Brief description',
    examples: ['usage example']
  },
  handler: async (context: CommandContext<DataType>) => {
    // Access parsed data via context.data
    // Access raw args via context.args
  }
};

export default command;
```

### Validation Schema (`params.ts`)

```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from '../../dist/types/command.js';

const Schema = v.object({
  field: v.pipe(v.string(), v.minLength(1))
});

export type DataType = v.InferInput<typeof Schema>;

const paramsDefinition: ParamsDefinition = {
  schema: Schema,
  mappings: [
    { field: 'field', option: 'field', argIndex: 0 }
  ]
};

export default paramsDefinition;
```

### Parameter Mapping

- `argIndex`: Positional CLI arguments (0-based)
- `option`: CLI flags/options (--field, -f)
- Schema field names must match mapping field names exactly

## Critical Rules & Constraints

### Type Safety (Non-Negotiable)

- ALL command handlers MUST use `CommandDefinition<T>` type
- ALL validation schemas MUST use `v.InferInput<typeof Schema>` for type inference
- ALL parameter mappings MUST map CLI args/options to schema fields exactly
- ALL imports from compiled output MUST use `.js` extensions (ESM requirement)

### File System Rules

- **NEVER** create `.js` files in `src/` or `app/` directories - TypeScript only
- Tests co-located with source files (`*.test.ts`)
- Generated CLIs use dynamic imports from compiled `examples/`

### Import Conventions (Strict)

- **Valibot**: `import * as v from 'valibot'` (never destructure)
- **Node built-ins**: `import { } from 'node:fs/promises'` (use `node:` prefix)
- **Compiled types**: `from '../../dist/types/command.js'` (always `.js` extension)

### Validation Philosophy

- Use valibot to parse AND transform inputs into type-safe structures
- Never manually validate - let valibot handle all input validation
- Type inference flows automatically from schema to handler
- Embrace valibot's composable validation pipeline with `v.pipe()`

## Development Workflow

### Creating Commands

1. Create folder: `app/[command-name]/`
2. Add required `command.ts` using exact template above
3. Add `params.ts` only if command needs arguments/options
4. Test with `npm run dev:regen` to regenerate CLI
5. Verify with `node examples/cli.js [command]`

### Testing & Validation

- Run `npm run dev:regen` after any command changes
- Use `node examples/cli.js [command]` to test generated CLI
- All validation errors are handled automatically by the framework

### Common Pitfalls

- Creating `.js` files in source directories
- Forgetting `.js` extensions in compiled imports
- Destructuring valibot imports (`import { object } from 'valibot'` ❌)
- Missing default exports in command files
- Incorrect type annotations on command handlers

### AI Assistant Guidelines

- Always use the exact templates provided above
- Test changes immediately with `npm run dev:regen`
- Focus on type safety and valibot integration
- Follow the "parse, don't validate" philosophy
- Ensure all imports use correct extensions and patterns
