---
inclusion: always
---

# Technology Stack & Development Guidelines

## Technology Constraints (Non-Negotiable)

- **Runtime**: Node.js 18+ with ESM modules only
- **Package Manager**: Bun (never npm/yarn for installation)
- **Build**: TypeScript compiler (tsc) - no bundlers
- **Validation**: valibot exclusively (never zod/joi)
- **Code Quality**: Biome for linting/formatting (never ESLint/Prettier)

## Dependency Rules

- Prefer Node.js built-ins (fs, path, process) over external packages
- Use valibot for all validation and type inference
- Minimize external dependencies

## Essential Commands

```bash
# Development
npm run dev                 # Hot reload development
npm run build              # Build library and examples
npm run generate:env-types # Generate env types (required after env changes)

# Testing
bun test                   # All tests
bun test --coverage       # With coverage

# Quality
npm run lint              # Biome linting and formatting
```

## Mandatory Architecture Patterns

### Factory Functions Only

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

### Lazy Loading (Performance Critical)

- Use dynamic imports for command modules
- Never import all commands at startup
- Defer expensive operations until needed

## File System Rules

**NEVER modify auto-generated directories:**

- `examples/` - Build output from `app/`
- `dist/` - Compiled library output
- `app/generated/` - Generated TypeScript types

**Always work in:**

- `src/` - Library source code
- `app/` - CLI commands
- `test/` - Test files

## TypeScript Requirements

- Strict mode enabled (never disable)
- ESNext target with ESM modules
- Use `.js` extensions in imports for ESM compatibility
- Incremental compilation for performance

## Performance Standards

- CLI startup: <100ms for simple commands
- Memory: Lazy load to prevent loading unused modules
- Bundle size: Minimize dependencies, prefer Node.js built-ins
