---
inclusion: always
---

# Tech Stack & Build System

## Core Technologies

- **TypeScript 5.8+**: Primary language with strict mode enabled
- **Node.js 24+**: Runtime environment (ESM modules)
- **Valibot**: Type-safe validation and parsing library (critical dependency)

## Development Tools

- **Biome**: Linting and code formatting (replaces ESLint + Prettier)
- **Vitest**: Testing framework with coverage reporting
- **mise**: Development environment management and file watching

## Build System Rules

- **TypeScript Compiler**: Compiles `src/` → `dist/` and `app/` → `examples/`
- **ESM Modules**: Pure ES modules with `"type": "module"` in package.json
- **Dynamic Imports**: Generated CLIs use dynamic imports for command loading
- **NEVER create .js files** in `src/` or `app/` directories - TypeScript only
- All imports from compiled output MUST use `.js` extensions

## Critical Dependencies

```json
{
  "dependencies": {
    "valibot": "^1.1.0"  // Critical for type-safe validation
  },
  "devDependencies": {
    "@biomejs/biome": "^2.1.1",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

## Development Workflow Commands

### Development

```bash
npm run dev              # Watch mode with auto-rebuild
npm run dev:build        # Build both src and app
npm run dev:regen        # Regenerate CLI from app directory
```

### Building

```bash
npm run build            # Compile src/ to dist/
npm run build:app        # Compile app/ to examples/
npm run clean            # Remove dist/ and examples/
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for TDD
vitest run path/to/test  # Run specific test file
```

### Code Quality

```bash
npm run lint             # Check code with Biome
```

### CLI Usage

```bash
npx decopin-cli build    # Generate CLI from app directory
node dist/cli.js         # Run the CLI builder itself
```

## TypeScript Configuration

- **Strict mode**: All strict checks enabled
- **ES2022 target**: Modern JavaScript features
- **ESNext modules**: Full ESM support
- **Declaration files**: Generated for type definitions
- **Source maps**: Enabled for debugging

## AI Assistant Guidelines

- Always use TypeScript with strict mode
- Import valibot as `import * as v from 'valibot'` (never destructure)
- Use `node:` prefix for Node.js built-ins: `import { } from 'node:fs/promises'`
- Test changes with `npm run dev:regen` after modifying commands
- Run `npm run build:app` to verify compilation
- Use Biome for code formatting and linting
