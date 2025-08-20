# Project Structure

## Root Directory Layout

```
├── src/                    # Library source code
├── app/                    # Example CLI application
├── test/                   # Test files
├── examples/               # Generated CLI examples (build output)
├── dist/                   # Compiled library output
├── scripts/                # Build and development scripts
└── docs/                   # Documentation
```

## Source Code Organization (`src/`)

Handler-based folder structure aligned with the 8 core handlers:

```
src/
├── cli.ts                  # CLI entry point
├── index.ts                # Main library exports
├── handlers/               # Handler implementations
│   ├── command/            # Command handler
│   │   ├── generator.ts    # CLI code generation
│   │   ├── parser.ts       # Command metadata parsing
│   │   └── types.ts        # Command-specific types
│   ├── params/             # Parameter handler
│   │   ├── validator.ts    # Parameter validation logic
│   │   └── mapper.ts       # Argument mapping
│   ├── help/               # Help handler
│   │   ├── formatter.ts    # Help text formatting
│   │   └── generator.ts    # Help content generation
│   ├── error/              # Error handler
│   │   ├── formatter.ts    # Error message formatting
│   │   └── types.ts        # Error-specific types
│   ├── env/                # Environment handler
│   │   ├── validator.ts    # Environment validation
│   │   └── generator.ts    # Type generation
│   ├── version/            # Version handler
│   │   └── formatter.ts    # Version display formatting
│   ├── middleware/         # Middleware handler
│   │   ├── executor.ts     # Middleware execution
│   │   └── template.ts     # Middleware templates
│   └── global-error/       # Global error handler
│       └── formatter.ts    # Global error formatting
├── core/                   # Core functionality
│   ├── scanner.ts          # File system scanning
│   ├── handler-executor.ts # Handler execution logic
│   ├── performance.ts      # Performance monitoring
│   └── types.ts            # Core types
├── types/                  # Type definitions
│   ├── context.ts          # Context types
│   ├── handlers.ts         # Handler types
│   ├── validation.ts       # Validation types
│   ├── handler-registry.ts # Handler registry
│   └── index.ts            # Type exports
├── generator/              # Code generation utilities
│   ├── env-types-generator.ts
│   ├── lazy-cli-template.ts
│   └── middleware-template.ts
├── internal/               # Internal utilities
│   └── guards/             # Type guards
└── utils/                  # Utility functions
    └── validation.ts
```

## App Directory Structure (`app/`)

File-based routing system inspired by Next.js:

```
app/
├── version.ts              # CLI version configuration
├── env.ts                  # Environment variable schema
├── middleware.ts           # Global middleware (optional)
├── global-error.ts         # Global error handler (optional)
├── generated/              # Auto-generated types
│   └── env-types.ts        # Generated environment types
├── hello/                  # Simple command
│   ├── command.ts          # Command handler
│   ├── params.ts           # Parameter validation
│   └── help.ts             # Help documentation
└── user/                   # Nested command group
    ├── create/             # user create subcommand
    │   ├── command.ts
    │   ├── params.ts
    │   ├── error.ts        # Custom error handler
    │   └── help.ts
    └── list/               # user list subcommand
        ├── command.ts
        ├── params.ts
        └── help.ts
```

## File Conventions

### Required Files

- `command.ts`: Main command logic (required for each command)

### Optional Files

- `params.ts`: Parameter validation and type definitions
- `help.ts`: Command help and documentation
- `error.ts`: Custom error handling
- `version.ts`: CLI version info (root level only)
- `env.ts`: Environment variable schema (root level only)
- `middleware.ts`: Global middleware (root level only)
- `global-error.ts`: Global error handler (root level only)

### File Naming Rules

- All handler files use kebab-case for directories
- Handler files are always named exactly: `command.ts`, `params.ts`, `help.ts`, `error.ts`
- Factory pattern: All handlers export a default factory function

## Test Organization (`test/`)

```
test/
├── command/                # Command parsing tests
├── core/                   # Core functionality tests
├── generator/              # Code generation tests
├── integration/            # End-to-end integration tests
├── internal/               # Internal utility tests
├── types/                  # Type system tests
└── utils/                  # Utility function tests
```

## Build Outputs

- `dist/`: Compiled library (TypeScript → JavaScript)
- `examples/`: Compiled app directory (for testing generated CLIs)
- `app/generated/`: Auto-generated TypeScript types

## Configuration Files

- `tsconfig.json`: Main TypeScript config for library
- `tsconfig.prod.json`: Production build config
- `app/tsconfig.json`: App-specific TypeScript config
- `biome.jsonc`: Linting and formatting rules
- `bunfig.toml`: Bun runtime configuration
