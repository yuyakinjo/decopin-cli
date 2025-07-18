---
inclusion: always
---

# Product Overview & Development Guidelines

**decopin-cli** is a TypeScript-first CLI builder that uses Next.js App Router-inspired file-based routing to create command-line interfaces with zero configuration.

## Core Architecture Principles

Commands are defined in the `app/` directory using file-based conventions:

- Each command lives in its own folder (e.g., `app/hello/`, `app/user/create/`)
- Required files: `command.ts` (command implementation)
- Optional files: `params.ts` (validation schema), `help.ts`, `error.ts`
- Nested commands supported through folder nesting

## Development Rules

### File Structure Requirements

- **Source code**: Only `.ts` files in `src/` and `app/` directories
- **Build outputs**: `src/` compiles to `dist/`, `app/` compiles to `examples/`
- **Command files**: Must export default with proper TypeScript types
- **Import conventions**: Use `.js` extensions when importing from compiled output

### Type Safety Requirements

- All command handlers must use `CommandDefinition<T>` type
- Validation schemas must use valibot with proper type inference
- Parameter mappings required for argument/option binding
- Context objects must be properly typed with `CommandContext<T>`

### Code Patterns to Follow

```typescript
// Command structure
const command: CommandDefinition<DataType> = {
  metadata: { name, description, examples },
  handler: async (context: CommandContext<DataType>) => { /* implementation */ }
};

// Validation pattern
const Schema = v.object({ /* valibot schema */ });
export type DataType = v.InferInput<typeof Schema>;
```

## Key Constraints

- **Parse, Don't Validate**: Always use valibot to parse inputs into type-safe structures
- **Dynamic imports**: Generated CLIs must use dynamic imports for command loading
- **ESM modules**: Pure ES modules with `"type": "module"`
- **Zero configuration**: Commands work without additional setup files

## Development Workflow

- Changes to `app/` directory automatically reflect in generated CLI
- Use `npm run dev:regen` to regenerate CLI after structural changes
- Test commands using the generated CLI in `examples/` directory
- Maintain type safety throughout the entire command pipeline
