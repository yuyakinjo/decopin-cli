---
inclusion: always
---

# Technology Stack & Development Guidelines

## Critical Technology Constraints

- **Runtime**: Node.js 18+ with ESM modules only
- **Package Manager**: Bun (never use npm/yarn for installation)
- **Build**: TypeScript compiler (tsc) - no bundlers
- **Validation**: valibot for all schemas (never use zod/joi)
- **Code Quality**: Biome for linting/formatting (never use ESLint/Prettier)

## Required Dependencies

When adding dependencies, prefer:

- **valibot** for validation and type inference
- **Node.js built-ins** (fs, path, process) for system operations
- Avoid external dependencies unless absolutely necessary

## Development Commands

Use these exact commands for development tasks:

```bash
# Development with hot reload
npm run dev

# Build library and examples
npm run build

# Generate environment types (required after env changes)
npm run generate:env-types

# Testing
bun test                    # All tests
npm run test:integration    # Integration only
bun test --coverage        # With coverage

# Code quality
npm run lint               # Biome linting and formatting
npm run clean             # Clean build artifacts

# Performance
npm run benchmark         # Run benchmarks
npm run benchmark:compare # Compare performance
```

## Architecture Requirements

### Factory Pattern (Mandatory)

All handlers MUST export default factory functions:

```typescript
// Correct pattern
export default function createHandler(context: CommandContext) {
  return async (params: ValidatedParams) => {
    // Implementation
  };
}

// Never export direct functions
export const handler = async () => {} // ❌ Wrong
```

### Lazy Loading (Performance Critical)

- Use dynamic imports for command modules
- Never import all commands at startup
- Defer expensive operations until needed

### TypeScript Configuration

- Strict mode enabled (never disable)
- ESNext target with ESM modules
- Incremental compilation for performance
- Source maps in development builds

## Build Output Rules

**Never modify these directories:**

- `examples/` - Auto-generated from `app/`
- `dist/` - Compiled library output
- `app/generated/` - Generated TypeScript types

**Always work in:**

- `src/` - Library source code
- `app/` - CLI application commands
- `test/` - Test files

## Performance Standards

- CLI startup: <100ms for simple commands
- Memory: Lazy load to prevent loading unused modules
- Build: Use incremental TypeScript compilation
- Bundle size: Minimize dependencies, prefer Node.js built-ins
