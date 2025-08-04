# decopin-cli Architecture Details

## Core Pipeline Architecture

The library implements a three-stage pipeline that transforms file-based commands into a working CLI:

### 1. Scanner Phase (`src/scanner/`)
- Discovers command files in the `app/` directory
- Detects special files: `middleware.ts`, `global-error.ts`, `version.ts`
- Identifies command structure based on file system layout
- Returns metadata about discovered commands

### 2. Parser Phase (`src/parser/`)
- Uses TypeScript AST to extract metadata from command files
- Parses handler functions to understand their signatures
- Extracts type information for validation
- Identifies parameter mappings and schemas
- Validates export patterns

### 3. Generator Phase (`src/generator/`)
- Creates the final CLI with dynamic imports
- Generates validation code from params definitions
- Integrates middleware execution pipeline
- Produces lazy-loading CLI for performance
- Handles error propagation and help generation

## Key Components

### Type System (`src/types/`)
- `context.ts`: Context types for all handlers
- `handlers.ts`: Handler function type definitions
- `validation.ts`: Validation-related types
- `middleware.ts`: Middleware type definitions
- `errors.ts`: Error handling types
- `command.ts`: Command metadata types

### Handler Types and Patterns

1. **ParamsHandler**: Can return three patterns:
   - Mappings-only (auto-generates valibot schema)
   - Schema-only (direct valibot schema)
   - Combined (schema + mappings)

2. **CommandHandler**: Async function receiving `CommandContext<T>`
   - Access to validated data
   - Environment variables
   - CLI arguments and options

3. **ErrorHandler**: Custom error handling per command
   - Receives full context including error
   - Can format user-friendly messages

4. **MiddlewareFactory**: Global cross-cutting concerns
   - Pre/post execution logic
   - Authentication, logging, monitoring

5. **GlobalErrorHandler**: Fallback error handling
   - Catches errors from commands without custom handlers
   - Centralized error formatting

## File-Based Routing

```
app/
├── command.ts           → /cli-name
├── hello/
│   └── command.ts       → /cli-name hello
└── user/
    ├── create/
    │   └── command.ts   → /cli-name user create
    └── list/
        └── command.ts   → /cli-name user list
```

## Validation Flow

1. CLI arguments parsed into positional args and options
2. Mappings define how to map CLI inputs to data structure
3. Valibot schema validates and transforms the data
4. Validated data passed to command handler via context
5. Errors caught and handled by error handlers

## Dynamic Import Strategy

Generated CLI uses dynamic imports for:
- Lazy loading of command modules
- Reduced startup time
- Better tree-shaking
- Conditional feature loading

## Middleware Execution Pipeline

```
CLI Input → Middleware 1 → Middleware 2 → ... → Command Handler
                ↓              ↓                      ↓
            (can abort)    (can abort)          (main logic)
```

## Build Process

1. TypeScript compilation (`tsc`)
2. Example app compilation
3. CLI generation from app structure
4. Path fixing for imports
5. Output to `dist/` and `examples/`