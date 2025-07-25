# decopin-cli

[![npm version](https://img.shields.io/npm/v/decopin-cli)](https://www.npmjs.com/package/decopin-cli)
[![Test](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml)
[![Integration Tests](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml)
[![Build Check](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml)
[![Lint](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml)
[![Performance](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/yuyakinjo/decopin-cli/performance-history/latest-badge.json&query=$.message&label=startup%20time&color=green)](https://github.com/yuyakinjo/decopin-cli/blob/performance-history/latest.md)

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
import type { ParamsHandler } from 'decopin-cli';

export type HelloData = {
  name: string;
};

export default function createParams(): ParamsHandler {
  return {
    schema: {
      name: {
        type: 'string',
        required: false,
        default: 'World',
        minLength: 1,
        errorMessage: 'Name cannot be empty',
      },
    },
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
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
└── user/                   # Nested user command group
    ├── create/             # user create - Create a user
    │   ├── command.ts
    │   ├── params.ts
    │   ├── error.ts
    │   └── help.ts
    └── list/               # user list - List users
        ├── command.ts
        ├── params.ts
        ├── error.ts
        └── help.ts
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

#### Basic Pattern (Manual Schema)

Simple and lightweight validation without external dependencies:

```typescript
import type { ParamsHandler } from 'decopin-cli';

export type UserData = {
  name: string;
  email: string;
  age?: number;
};

export default function createParams(): ParamsHandler {
  return {
    schema: {
      name: {
        type: 'string',
        required: true,
        minLength: 1,
        errorMessage: 'Name is required',
      },
      email: {
        type: 'string',
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        errorMessage: 'Invalid email format',
      },
      age: {
        type: 'number',
        required: false,
        default: 25,
        min: 0,
        max: 150,
      },
    },
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

#### Advanced Pattern (Valibot Schema)

For complex validation scenarios with full type inference:

```typescript
import * as v from 'valibot';
import type { ParamsHandler } from 'decopin-cli';

const UserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
  age: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(150)), 25),
});

export type UserData = v.InferInput<typeof UserSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: UserSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
      },
      {
        field: 'email',
        option: 'email',
        argIndex: 1,
      },
      {
        field: 'age',
        option: 'age',
      },
    ],
  };
}
```

**Features:**
- **Schema Options**: Manual schema (simple) or Valibot schema (advanced)
- **Argument Mapping**: Flexible mapping between positional and option arguments
- **Default Values**: Default value configuration within schema
- **Priority**: Positional arguments → Option arguments → Default values
- **Type Safety**: Full TypeScript support with both patterns

**When to use each pattern:**
- **Manual Schema**: Best for simple CLIs, minimal dependencies, straightforward validation
- **Valibot Schema**: Best for complex validation, advanced type transformations, nested objects

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
import type { HelpHandler } from 'decopin-cli';

export default function createHelp(): HelpHandler {
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
import type { VersionInfo } from '../dist/index.js';

export default function createVersion(): VersionInfo {
  return {
    version: "1.2.0",
    metadata: {
      name: "my-awesome-cli",
      version: "1.2.0",
      description: "My awesome CLI tool",
      author: "Developer Name <dev@example.com>",
      homepage: "https://github.com/username/my-cli",
      license: "MIT"
    }
  };
}
```

**Configuration Items:**
- **version**: Version string
- **metadata**: CLI-wide metadata
  - **name**: CLI name
  - **version**: CLI version
  - **description**: CLI description
  - **author**: Author information
  - **homepage**: Project homepage (optional)
  - **license**: License information (optional)

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
import type { HelpHandler } from 'decopin-cli';

export default function createHelp(): HelpHandler {
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

## 🚧 Roadmap & TODO

### Planned Features

#### 🌍 Environment Variable Integration
- **Auto environment mapping**: Automatically map options to environment variables
- **Fallback chain**: CLI options → Environment variables → Default values
- **Custom env prefixes**: Support for `MY_CLI_` prefixed environment variables

```typescript
// Planned API
export default function createParams(): ParamsHandler {
  return {
    schema: {
      apiKey: {
        type: 'string',
        required: true,
        env: 'API_KEY',  // Maps to process.env.API_KEY
        envPrefix: 'MY_CLI_',  // Maps to MY_CLI_API_KEY
      },
    },
    mappings: [...],
  };
}
```

#### 🔄 Lifecycle Hooks
- **Pre/Post action hooks**: Execute logic before and after command execution
- **Global and command-specific hooks**: Support both CLI-wide and per-command hooks
- **Error handling hooks**: Custom error processing hooks

```typescript
// Planned API
// app/hooks.ts - Global hooks
export const hooks = {
  preAction: async (context) => {
    console.log(`About to execute: ${context.command.name}`);
  },
  postAction: async (context, result) => {
    console.log(`Completed: ${context.command.name}`);
  },
};

// app/user/create/hooks.ts - Command-specific hooks
export default {
  preAction: async (context) => {
    // Validate user permissions before creating
  },
};
```

#### 🏁 Shell Autocompletion
- **Multi-shell support**: Generate completion scripts for bash, zsh, fish, PowerShell
- **Dynamic completion**: Context-aware completion based on current command state
- **Custom completion functions**: User-defined completion logic

```bash
# Planned CLI options
decopin-cli build --completion=bash > my-cli-completion.bash
decopin-cli build --completion=zsh > _my-cli
decopin-cli build --completion=fish > my-cli.fish

# Auto-install completions
decopin-cli build --install-completion=bash
```

#### 🔧 Advanced Option Features
- **Option choices**: Restrict option values to predefined sets
- **Option conflicts/implies**: Define option dependencies and conflicts
- **Variadic options**: Support for multiple values per option
- **Option groups**: Group related options in help output

### Implementation Priority
1. **Environment Variable Integration** - High priority, commonly requested
2. **Shell Autocompletion** - High priority, essential for production CLIs
3. **Lifecycle Hooks** - Medium priority, useful for complex workflows
4. **Advanced Option Features** - Lower priority, nice-to-have features

### Contributing
We welcome contributions! If you'd like to work on any of these features, please:
1. Open an issue to discuss the implementation approach
2. Check existing issues to avoid duplicate work
3. Follow our coding standards and testing practices

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Next.js App Router's file-based routing
- Built with TypeScript and modern Node.js features
- Uses valibot for type-safe validation

---

**decopin-cli** - Build CLIs like you build Next.js apps! 🚀
