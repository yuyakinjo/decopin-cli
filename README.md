# decopin-cli

[![Test](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml)
[![Integration Tests](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml)
[![Build Check](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml)
[![Lint](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml)

A TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. Create powerful command-line interfaces with zero configuration using familiar file-based conventions and pre-validated, type-safe command contexts.

## ✨ Features

- **📁 File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **🔧 TypeScript-first**: Full TypeScript support with proper type definitions
- **⚡ Pre-validated data**: Commands receive type-safe, pre-validated data from `params.ts`
- **🔍 AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **🛡️ Integrated validation**: Built-in validation with valibot, no separate `validate.ts` needed
- **🎯 Function-based commands**: Clean function-based command definitions with dependency injection
- **🔄 Real-time development**: Changes reflect instantly with mise watch tasks
- **📦 Zero configuration**: Works out of the box with sensible defaults
- **⚡ Dynamic imports**: Generated CLIs use dynamic imports for instant command loading
- **🏷️ Command aliases**: Support for command aliases (e.g., `hi` → `hello`, `add` → `user create`)

## 🚀 Quick Start

### Installation

```bash
npm i -D decopin-cli
```

### Create your first CLI

1. **Initialize project structure**:
```bash
mkdir my-cli && cd my-cli
npm init -y
npm install decopin-cli
```

2. **Create app directory and your first command**:
```bash
mkdir -p app/hello
```

3. **Create `app/hello/command.ts`**:

```typescript
import type { CommandContext } from '../../dist/types/index.js';
import type { HelloData } from './params.js';

export default async function createCommand(context: CommandContext<HelloData>) {
  const { name } = context.validatedData;

  console.log(`Hello, ${name}!!!`);
}
```

4. **Create `app/hello/params.ts` for type-safe argument validation**:

```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from 'decopin-cli';

const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: HelloSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
      },
    ],
  };
}
```

5. **Generate your CLI**:

```bash
npx decopin-cli build
```

6. **Test your CLI**:

```bash
node dist/cli.js hello Alice
# Output: Hello, Alice!

node dist/cli.js hello --name Bob
# Output: Hello, Bob!

# Using aliases
node dist/cli.js hi Alice
# Output: Hello, Alice!
```

## 🏗️ Architecture

### Function-Based Command Pattern

```
app/
├── version.ts              # Version configuration
├── hello/                  # Simple hello command
│   ├── command.ts
│   ├── params.ts
│   └── help.ts
├── user/                   # Nested user command group
│   ├── create/             # user create - Create a user
│   │   ├── command.ts
│   │   ├── params.ts
│   │   └── help.ts
│   └── list/               # user list - List users
│       ├── command.ts
│       ├── params.ts
│       └── help.ts
└── test/                   # Test command group
    ├── basic/              # Basic test command
    │   └── command.ts
    ├── validation/         # Validation test command
    │   ├── command.ts
    │   └── params.ts
    └── custom-error/       # Custom error test command
        ├── command.ts
        ├── params.ts
        └── error.ts
```

decopin-cli uses a simple function pattern where commands are async functions that receive pre-validated contexts:

```typescript
// decopin-cli approach
export default async function createCommand(context: CommandContext<HelloData>) {
  const { name } = context.validatedData; // Already validated and typed!

  console.log(`Hello, ${name}!!!`);
}
```

## 📁 File Types and Conventions

decopin-cli uses specific files with defined roles in each command directory to define CLI behavior.

### `command.ts` - Command Handler

Defines the main command logic. Exports an async function by default and receives a type-safe context.

```typescript
import type { CommandContext } from '../../dist/types/index.js';
import type { UserData } from './params.js';

export default async function createCommand(context: CommandContext<UserData>) {
  const { name, email } = context.validatedData; // Pre-validated data

  // Main command logic
  console.log(`Creating user: ${name} (${email})`);
}
```

**Requirements:**
- Provide async function as default export
- Accept `CommandContext<T>` or `BaseCommandContext`
- When `params.ts` exists, validated data is available via `context.validatedData`

### `params.ts` - Argument Definition and Validation

Defines command argument types, validation schemas, and mapping configurations.

```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from 'decopin-cli';

const UserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
  age: v.optional(v.number(), 25),
});

export type UserData = v.InferInput<typeof UserSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: UserSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',      // --name option
        argIndex: 0,         // 1st positional argument
      },
      {
        field: 'email',
        option: 'email',     // --email option
        argIndex: 1,         // 2nd positional argument
      },
      {
        field: 'age',
        option: 'age',       // --age option only (no positional)
      },
    ],
  };
}
```

**Features:**
- **Schema Definition**: Type-safe validation with valibot
- **Argument Mapping**: Flexible mapping between positional and option arguments
- **Default Values**: Default value configuration within schema
- **Priority**: Positional arguments → Option arguments → Default values

### `error.ts` - Custom Error Handling

Defines custom error handlers for validation errors and command execution errors.

```typescript
import type { ValiError } from 'valibot';

export default function createErrorHandler() {
  return async function handleError(error: ValiError<any>) {
    console.error('🚫 Input error occurred:');

    for (const issue of error.issues) {
      const field = issue.path?.join('.') || 'unknown';
      console.error(`  • ${field}: ${issue.message}`);
    }

    console.error('\n💡 Correct format: my-cli user create <name> <email>');
    process.exit(1);
  };
}
```

**Use Cases:**
- Customize validation error display
- User-friendly error messages
- Provide additional help information

### `help.ts` - Help Information

Defines detailed command help information, usage examples, aliases, etc.

```typescript
import type { CommandHelpMetadata } from 'decopin-cli';

export default function createHelp(): CommandHelpMetadata {
  return {
    name: 'user create',
    description: 'Create a new user',
    examples: [
      'user create "John Doe" "john@example.com"',
      'user create --name "Alice" --email "alice@example.com"',
      'user create "Bob" --email "bob@test.com" --age 30'
    ],
    aliases: ['add-user', 'new-user'],
    additionalHelp: `
This command creates a new user.
Name and email address are required. Age is optional with a default value of 25.
    `.trim()
  };
}
```

**Provided Information:**
- Command description
- List of usage examples
- Command aliases
- Additional help text

### `version.ts` - Version Information

Defines CLI version information and metadata (place in root `app/version.ts`).

```typescript
export const version = "1.2.0";

export const metadata = {
  name: "my-awesome-cli",
  version: "1.2.0",
  description: "My awesome CLI tool",
  author: "Developer Name <dev@example.com>",
  homepage: "https://github.com/username/my-cli",
  license: "MIT"
};

export default version;
```

**Configuration Items:**
- **version**: Version string
- **metadata**: CLI-wide metadata
- **name**: CLI name
- **description**: CLI description
- **author**: Author information

### File Combination Patterns

**Minimal Configuration:**
```
app/simple/
└── command.ts          # Basic command
```

**Complete Configuration:**
```
app/complex/
├── command.ts          # Main logic
├── params.ts           # Argument definition
├── error.ts            # Error handling
└── help.ts             # Help information
```

### Integrated Validation

Validation is integrated into `params.ts`, providing type-safe parameter handling using valibot schemas:

```text
app/hello/
├── params.ts    # ✅ Types + valibot schema + mappings
└── command.ts   # ✅ Command logic (receives validated data)
```

## 🎯 Argument Processing

decopin-cli automatically handles argument validation and type conversion based on your `params.ts` configuration:

#### Positional Arguments
```bash
my-cli user create "John Doe" "john@example.com"
```

#### Named Options
```bash
my-cli user create --name "John Doe" --email "john@example.com"
```

#### Mixed Arguments (positional takes precedence)
```bash
my-cli user create "Jane" --email "jane@example.com"
# name will be "Jane" (from position 0), not from --name option
```

## 🔧 Version Configuration

Create `app/version.ts` to configure CLI metadata:

```typescript
export const version = "1.0.0"

export const metadata = {
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI tool",
  author: "Your Name"
}

export default version
```

## 🔄 Development

### Auto-regeneration with Mise

For development, use the built-in mise configuration for automatic CLI regeneration:

```bash
# Install mise if you haven't already
curl https://mise.run | sh

# Start development mode with auto-regeneration
npm run dev
```

### Manual Build

```bash
npm run build
npx decopin-cli build --app-dir app --output-dir examples
```

## 📋 CLI Options

### Build Command

```bash
decopin-cli build [options]
```

**Options:**

- `--output-dir <dir>`: Output directory (default: `dist`)
- `--output-file <file>`: Output file name (default: `cli.js`)
- `--app-dir <dir>`: App directory path (default: `app`)
- `--cli-name <name>`: CLI name for generated files

### Help Command

```bash
decopin-cli --help
```

Shows available commands and options.

### Version Command

```bash
decopin-cli --version
```

Shows the current version of decopin-cli.

## 🔍 Advanced Features

### Command Context

Commands with parameters receive a `CommandContext<T>` with pre-validated data:

```typescript
interface CommandContext<T> {
  validatedData: T;         // Pre-validated typed data from params.ts
  args: string[];           // Positional arguments
  options: Record<string, string | boolean>; // Named options
  params: Record<string, string>; // Dynamic route parameters
  showHelp: () => void;     // Function to show command help
}
```

### Commands without Parameters

For commands that don't need parameters, simply omit the `params.ts` file:

```typescript
// app/status/command.ts
import type { BaseCommandContext } from 'decopin-cli';

export default async function createCommand(context: BaseCommandContext) {
  console.log('✅ Application is running');
}
```

### Help Documentation

Create `help.ts` to provide detailed command documentation:

```typescript
// app/hello/help.ts
import type { CommandHelpMetadata } from 'decopin-cli';

export default function createHelp(): CommandHelpMetadata {
  return {
    name: 'hello',
    description: 'Say hello to someone',
    examples: [
      'hello Alice',
      'hello --name Bob',
      'hello "Alice Smith"'
    ],
    aliases: ['hi', 'greet'],
    additionalHelp: 'This command greets a person with a friendly hello message.'
  };
}
```

### Error Handling

```typescript
export default async function createCommand(context: CommandContext<UserData>) {
  const { name, email } = context.validatedData;

  try {
    await createUser(name, email);
    console.log('✅ User created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Next.js App Router's file-based routing
- Built with TypeScript and modern Node.js features
- Uses valibot for type-safe validation

---

**decopin-cli** - Build CLIs like you build Next.js apps! 🚀
