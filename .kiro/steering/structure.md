---
inclusion: always
---

# Project Structure & Architecture Rules

## Critical File System Constraints

- **NEVER create .js files** in `src/` or `app/` directories - TypeScript only
- `src/` compiles to `dist/`, `app/` compiles to `examples/`
- All imports from compiled output MUST use `.js` extensions
- Tests are co-located with source files (`*.test.ts`)

## Command Structure (File-Based Routing)

Commands use folder-based routing in `app/` directory:

```text
app/
├── version.ts              # CLI metadata (required)
├── [command]/              # Simple command
│   ├── command.ts          # REQUIRED: Command implementation
│   ├── params.ts           # OPTIONAL: Valibot schema
│   ├── help.ts             # OPTIONAL: Custom help
│   └── error.ts            # OPTIONAL: Error handling
└── [parent]/[child]/       # Nested commands
    └── command.ts          # Same structure applies
```

## Mandatory Code Patterns

### Command Implementation Template

Every `command.ts` MUST follow this exact pattern:

```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';

const command: CommandDefinition<DataType> = {
  metadata: {
    name: 'command-name',
    description: 'Brief description',
    examples: ['usage example']
  },
  handler: async (context: CommandContext<DataType>) => {
    // Implementation
  }
};

export default command;
```

### Validation Schema Template

When `params.ts` exists, use this exact pattern:

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

## Import Rules (Non-Negotiable)

### Required Import Patterns

- **Valibot**: `import * as v from 'valibot'` (never destructure)
- **Node built-ins**: `import { } from 'node:fs/promises'` (use node: prefix)
- **Compiled types**: `from '../../dist/types/command.js'` (always .js extension)
- **Relative imports**: Preferred within same directory

### Type Safety Requirements

- ALL command handlers MUST use `CommandDefinition<T>` type
- ALL validation schemas MUST use `v.InferInput<typeof Schema>`
- ALL parameter mappings MUST map CLI args/options to schema fields

## Development Workflow

### Creating New Commands

1. Create folder in `app/` directory: `app/[command-name]/`
2. Add required `command.ts` with exact template above
3. Add optional `params.ts` only if command needs arguments/options
4. Test with `npm run dev:regen` to regenerate CLI
5. Verify compilation with `npm run build:app`

### Common Mistakes to Avoid

- Creating .js files in source directories
- Forgetting .js extensions in compiled imports
- Destructuring valibot imports
- Missing default exports in command files
- Incorrect type annotations on command handlers

### Testing Commands

- Run `npm run dev:regen` after changes
- Use `node examples/cli.js [command]` to test
- All tests co-located with source files (`*.test.ts`)
