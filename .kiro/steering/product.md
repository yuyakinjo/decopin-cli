---
inclusion: always
---

# decopin-cli Development Guidelines

**decopin-cli** is a TypeScript-first CLI builder using file-based routing (Next.js App Router style) for zero-configuration command-line interfaces.

## Command Architecture Rules

### File-Based Command Structure

- Commands live in `app/` directory with folder-based routing
- Each command requires its own folder: `app/[command-name]/`
- Nested commands supported: `app/user/create/`, `app/user/list/`

### Required Files Per Command

- `command.ts` - REQUIRED: Default export with `CommandDefinition<T>`
- `params.ts` - OPTIONAL: Valibot schema + type definitions
- `help.ts` - OPTIONAL: Custom help text
- `error.ts` - OPTIONAL: Custom error handling

## Mandatory Code Patterns

### Command Implementation

```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';

const command: CommandDefinition<DataType> = {
  metadata: {
    name: 'command-name',
    description: 'Brief description',
    examples: ['usage example']
  },
  handler: async (context: CommandContext<DataType>) => {
    // Implementation here
  }
};

export default command;
```

### Validation Schema (when params.ts exists)

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

## Critical Development Constraints

### Type Safety (Non-Negotiable)

- ALL command handlers MUST use `CommandDefinition<T>` type
- ALL validation schemas MUST use valibot with `v.InferInput<typeof Schema>`
- ALL parameter mappings MUST map CLI args/options to schema fields
- ALL imports from compiled output MUST use `.js` extensions

### File System Rules

- ONLY `.ts` files allowed in `src/` and `app/` directories
- NO `.js` files in source directories
- `src/` compiles to `dist/`, `app/` compiles to `examples/`
- Generated CLIs use dynamic imports from `examples/`

### Import Conventions

- Valibot: `import * as v from 'valibot'`
- Node built-ins: `import { } from 'node:fs/promises'`
- Compiled output: `from '../../dist/types/command.js'` (always .js)
- Relative imports within same directory preferred

## Parse, Don't Validate Philosophy

- Use valibot to parse AND transform inputs into type-safe structures
- Never manually validate - let valibot handle all input validation
- Type inference flows from schema to handler automatically

## AI Assistant Guidelines

- When creating commands, always start with the required `command.ts`
- Add `params.ts` only if the command needs arguments or options
- Follow exact TypeScript patterns shown above
- Test command structure by running `npm run dev:regen`
- Maintain ESM module compatibility throughout
