# Product Overview

**decopin-cli** is a TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. It enables developers to create powerful command-line interfaces with zero configuration using familiar file-based conventions and pre-validated, type-safe command contexts.

## Key Features

- **File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **TypeScript-first**: Full TypeScript support with proper type definitions and inference
- **Pre-validated data**: Commands receive type-safe, pre-validated data from `params.ts`
- **AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **Integrated validation**: Built-in validation with valibot, no separate validate.ts needed
- **Function-based commands**: Clean function-based command definitions with dependency injection
- **Dynamic imports**: Generated CLIs use dynamic imports for instant command loading
- **Zero configuration**: Works out of the box with sensible defaults

## Architecture Philosophy

The project follows a lazy-loading architecture to minimize startup time and memory usage by only loading modules when they are actually needed. Commands are defined as async functions that receive pre-validated contexts, similar to how Next.js handles API routes.

## Target Users

Developers who want to build CLIs with the same developer experience as modern web frameworks, emphasizing type safety, convention over configuration, and minimal boilerplate.
