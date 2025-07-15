# Product Overview

**decopin-cli** is a TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system.

## Core Purpose
Create powerful command-line interfaces with zero configuration using familiar file-based conventions. Commands are defined in an `app/` directory structure that mirrors Next.js App Router patterns.

## Key Features
- **File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **TypeScript-first**: Full TypeScript support with proper type definitions
- **Dynamic imports**: Generated CLIs use dynamic imports for instant command loading
- **AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **Type-safe validation**: Built-in validation with valibot for robust argument parsing
- **Flexible argument handling**: Support for both positional arguments and named options
- **Real-time development**: Changes reflect instantly without restarts
- **Zero configuration**: Works out of the box with sensible defaults

## Target Users
Developers who want to build CLIs with the same developer experience as building Next.js applications - file-based, type-safe, and convention-over-configuration.

## Philosophy
- **Parse, Don't Validate**: Use valibot to parse inputs into type-safe structures rather than just validating
- **Developer Experience First**: Prioritize ease of use and type safety
- **Convention over Configuration**: Sensible defaults with minimal setup required