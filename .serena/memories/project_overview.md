# Decopin-CLI Project Overview

## Purpose
decopin-cli is a TypeScript-first CLI builder that uses Next.js App Router-inspired file-based routing to create command-line interfaces with zero configuration. Commands are defined as functions that receive pre-validated data through a type-safe context.

## Key Features
- 📁 File-based routing: Commands defined in `app/` directory with intuitive folder structure
- 🔧 TypeScript-first: Full TypeScript support with proper type definitions  
- ⚡ Pre-validated data: Commands receive type-safe, pre-validated data from `params.ts`
- 🔍 AST parsing: TypeScript AST parsing for automatic command metadata extraction
- 🛡️ Integrated validation: Built-in validation with valibot
- 🎯 Function-based commands: Clean function-based command definitions with dependency injection
- 🔄 Real-time development: Changes reflect instantly with dev watch mode
- 📦 Zero configuration: Works out of the box with sensible defaults
- ⚡ Dynamic imports: Generated CLIs use dynamic imports for instant command loading
- 🏷️ Command aliases: Support for command aliases
- 🔌 Middleware support: Global middleware for authentication, logging, and cross-cutting concerns

## Tech Stack
- **Language**: TypeScript (v5.9.2)
- **Runtime**: Node.js (>= 18.0.0) with Bun support
- **Validation**: Valibot
- **Linting/Formatting**: Biome
- **Testing**: Bun test (with integration tests)
- **Build Tool**: TypeScript compiler (tsc)
- **Development Tools**: Bun for dev watching and scripts

## Project Structure
```
decopin-cli/
├── src/                # Core library source
│   ├── scanner/        # Discovers command files
│   ├── parser/         # TypeScript AST parsing
│   ├── generator/      # CLI generation
│   ├── types/          # TypeScript definitions
│   └── cli.ts          # CLI entry point
├── app/                # Example CLI commands
│   ├── hello/          # Example command
│   ├── user/           # Nested command group
│   ├── middleware.ts   # Global middleware
│   └── global-error.ts # Global error handler
├── test/               # Test suite
├── scripts/            # Development scripts
└── examples/           # Generated example CLI
```

## Key Concepts
1. **Parse, Don't Validate**: All inputs are parsed into type-safe structures using valibot schemas
2. **Type Safety Throughout**: Maintains type safety from CLI arguments through validation to command execution
3. **Zero Configuration**: The file structure itself defines the CLI structure
4. **Dynamic Import Strategy**: Generated CLIs use dynamic imports for lazy loading
5. **Simple Function Pattern**: Commands are async functions that directly execute logic