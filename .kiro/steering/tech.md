# Technology Stack

## Runtime & Build System

- **Runtime**: Node.js 18+ (ESM modules)
- **Package Manager**: Bun (with bun.lock)
- **Build System**: TypeScript compiler (tsc)
- **Bundler**: None (pure TypeScript compilation to ESM)

## Core Dependencies

- **valibot**: Schema validation and type inference
- **TypeScript**: Language and type system
- **Node.js built-ins**: fs, path, process for CLI operations

## Development Tools

- **Biome**: Linting and formatting (replaces ESLint + Prettier)
- **Bun**: Test runner and package manager
- **TypeScript**: Compilation and type checking

## Common Commands

### Development

```bash
# Start development mode with file watching
npm run dev

# Build library and app
npm run build

# Generate environment types
npm run generate:env-types

# Build production version
npm run build:prod
```

### Testing

```bash
# Run all tests
bun test

# Run integration tests only
npm run test:integration

# Run tests with coverage
bun test --coverage
```

### Code Quality

```bash
# Lint and format code
npm run lint

# Clean build artifacts
npm run clean
```

### Benchmarking

```bash
# Run performance benchmarks
npm run benchmark

# Compare before/after performance
npm run benchmark:compare
```

## Build Configuration

- **TypeScript**: Strict mode enabled, ESNext target, ESM modules
- **Output**: `dist/` for library, `examples/` for app compilation
- **Source Maps**: Enabled for development builds
- **Incremental**: TypeScript incremental compilation enabled

## Architecture Patterns

- **Lazy Loading**: Dynamic imports for performance optimization
- **Factory Pattern**: All handlers use factory functions for dependency injection
- **Context-based**: Consistent context objects across all handler types
- **AST Parsing**: TypeScript AST analysis for metadata extraction
