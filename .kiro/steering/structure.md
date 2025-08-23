---
inclusion: always
---

# Project Structure & File Conventions

## Critical File Placement Rules

**NEVER modify files in these directories:**

- `examples/` - Auto-generated build output, changes will be overwritten
- `dist/` - Compiled library output
- `app/generated/` - Auto-generated TypeScript types

**Always work in these directories:**

- `src/` - Library source code
- `app/` - CLI application commands
- `test/` - Test files

## App Directory File-Based Routing

Commands follow Next.js-style file-based routing in `app/`:

```text
app/
├── command.ts              # Root command (optional)
├── version.ts              # CLI version (required at root)
├── env.ts                  # Environment schema (optional at root)
├── middleware.ts           # Global middleware (optional at root)
├── global-error.ts         # Global error handler (optional at root)
├── hello/                  # Simple command → `cli hello`
│   ├── command.ts          # Required: command handler
│   ├── params.ts           # Optional: parameter validation
│   └── help.ts             # Optional: help documentation
└── user/                   # Command group → `cli user`
    ├── create/             # Subcommand → `cli user create`
    │   ├── command.ts      # Required
    │   ├── params.ts       # Optional
    │   ├── error.ts        # Optional: custom error handler
    │   └── help.ts         # Optional
    └── list/               # Subcommand → `cli user list`
        ├── command.ts      # Required
        ├── params.ts       # Optional
        └── help.ts         # Optional
```

## Handler File Patterns

### Required Pattern: Factory Functions

All handlers MUST export a default factory function:

```typescript
// command.ts
export default function createHandler(context: CommandContext) {
  return async (params: ValidatedParams) => {
    // Command logic
  };
}

// params.ts
import { object, string } from 'valibot';
export const schema = object({
  name: string(),
});

// help.ts
export default function createHelp(context: HelpContext) {
  return {
    description: "Command description",
    examples: ["cli command --name value"]
  };
}
```

### File Naming Conventions

- Directories: kebab-case (`user-management/`, `api-client/`)
- Handler files: exact names (`command.ts`, `params.ts`, `help.ts`, `error.ts`)
- Never use index files in command directories

## Source Code Organization

```text
src/
├── cli.ts                  # CLI entry point
├── index.ts                # Library exports
├── handlers/               # 8 core handlers (command, params, help, etc.)
├── core/                   # Scanner, executor, performance
├── types/                  # All TypeScript definitions
├── generator/              # Code generation utilities
├── internal/guards/        # Type guards and validation
└── utils/                  # Shared utilities
```

## Working with Commands

### Adding New Commands

1. Create directory in `app/` (e.g., `app/deploy/`)
2. Add required `command.ts` with factory function
3. Add optional `params.ts` with valibot schema
4. Add optional `help.ts` for documentation

### Modifying Existing Commands

- Edit files in `app/` directory only
- Never modify generated files in `examples/`
- Use `npm run dev` to test changes immediately

### Command Context Rules

- Commands receive pre-validated contexts
- No manual validation needed in command handlers
- Context includes parsed params, environment, metadata
- Always use async functions for command handlers

## Test Organization

```text
test/
├── integration/            # End-to-end CLI tests
├── core/                   # Core functionality tests
├── command/                # Command parsing tests
└── utils/                  # Utility function tests
```

When adding tests, match the source structure and use descriptive names.
