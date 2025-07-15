# Project Structure & Organization

## Directory Layout

```
decopin-cli/
├── src/                    # Core TypeScript source (NO .js files)
│   ├── cli.ts             # Main CLI entry point
│   ├── index.ts           # Public API exports
│   ├── generator/         # CLI generation logic
│   │   ├── cli-generator.ts
│   │   └── cli-generator.test.ts
│   ├── parser/            # AST parsing utilities
│   │   ├── ast-parser.ts
│   │   ├── ast-parser.test.ts
│   │   ├── version-parser.ts
│   │   └── version-parser.test.ts
│   ├── scanner/           # Directory scanning
│   │   ├── directory-scanner.ts
│   │   └── directory-scanner.test.ts
│   ├── types/             # Type definitions
│   │   └── command.ts
│   └── utils/             # Shared utilities
│       ├── validation.ts
│       ├── validation.test.ts
│       └── params.test.ts
├── app/                   # Example CLI structure (NO .js files)
│   ├── version.ts         # CLI metadata
│   ├── hello/             # Simple command example
│   │   ├── command.ts     # Command implementation
│   │   ├── params.ts      # Valibot validation schema
│   │   └── validate.ts    # Validation logic
│   └── user/              # Nested command example
│       ├── create/
│       │   ├── command.ts
│       │   ├── params.ts
│       │   ├── validate.ts
│       │   └── error.ts
│       └── list/
│           └── command.ts
├── dist/                  # Compiled output from src/
├── examples/              # Compiled output from app/
└── node_modules/
```

## File Naming Conventions

### Command Structure Files
- `command.ts` - Command implementation (required)
- `params.ts` - Valibot schema and field mappings (optional)
- `validate.ts` - Validation logic (optional)
- `error.ts` - Custom error handlers (optional)

### Source Files
- `*.ts` - TypeScript source files
- `*.test.ts` - Test files (co-located with source)
- `*.d.ts` - Type definition files (generated)

## Architecture Patterns

### Command Definition Pattern
```typescript
// app/[command]/command.ts
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';

const command: CommandDefinition<DataType> = {
  metadata: {
    name: 'command-name',
    description: 'Command description',
    examples: ['example usage']
  },
  handler: async (context: CommandContext<DataType>) => {
    // Implementation
  }
};

export default command;
```

### Validation Pattern
```typescript
// app/[command]/params.ts
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

## Import Conventions

### Internal Imports
- Use relative imports within same directory
- Use absolute imports from project root for cross-directory
- Always use `.js` extension for compiled output references

### External Dependencies
- `valibot` - Always import as `* as v from 'valibot'`
- Node.js built-ins - Use `node:` prefix (e.g., `node:fs/promises`)

## Build Output Structure

### dist/ (from src/)
- Compiled JavaScript with source maps
- Type declaration files (.d.ts)
- Preserves directory structure

### examples/ (from app/)
- Compiled command examples
- Used by generated CLIs for dynamic imports
- Mirrors app/ directory structure

## Testing Organization
- Tests co-located with source files (`*.test.ts`)
- Integration tests in `src/integration/`
- Test utilities in `src/utils/` (shared)
- Coverage reports exclude CLI entry points and test files