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
npm install decopin-cli valibot
```

2. **Create app directory and your first command**:
```bash
mkdir -p app/hello
```

3. **Create `app/hello/command.ts`**:

```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';
import type { HelloData } from './params.js';

export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  // Use pre-validated data
  const { name } = context.validatedData;

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
```

4. **Create `app/hello/params.ts` for type-safe argument validation**:

```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from 'decopin-cli';

// Hello command data schema
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
│   │   ├── help.ts
│   │   └── error.ts
│   └── list/               # user list - List users
│       ├── command.ts
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

## 🛠️ Command Structure Details

### Command with Parameters (Hello Command)

**app/hello/params.ts**:
```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from '../../dist/types/command.js';

// Hello command data schema
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

**app/hello/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';
import type { HelloData } from './params.js';

export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  // Use pre-validated data
  const { name } = context.validatedData;

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
```

### Command with Complex Parameters (User Create)

**app/user/create/params.ts**:
```typescript
import * as v from 'valibot';
import type { ParamsDefinition } from '../../../dist/types/command.js';

// User creation data schema
const CreateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
});

export type CreateUserData = v.InferInput<typeof CreateUserSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: CreateUserSchema,
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
    ],
  };
}
```

**app/user/create/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CreateUserData } from './params.js';

export default function createCommand(context: CommandContext<CreateUserData>): CommandDefinition<CreateUserData> {
  // Use pre-validated data
  const { name, email } = context.validatedData;

  return {
    handler: async () => {
      console.log(`🔄 Creating user: ${name} (${email})`);

      // Implement actual logic here
      // Example: await createUser({ name, email });

      console.log('✅ User created successfully!');
    }
  };
}
```

### Command without Parameters (User List)

**app/user/list/command.ts**:
```typescript
import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';

export default function createCommand(context: CommandContext): CommandDefinition {
  return {
    handler: async (context: CommandContext) => {
      const limit = Number(context.options.limit) || 10;

      console.log('📋 User List:');
      for (let i = 1; i <= limit; i++) {
        console.log(`  ${i}. User ${i} (user${i}@example.com)`);
      }
      console.log(`\n📊 Showing ${limit} users`);
    }
  };
}
```

## 🏗️ Architecture

### Function-Based Command Pattern

decopin-cli uses a factory pattern where commands are functions that receive pre-validated contexts:

```typescript
// decopin-cli approach (current)
export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  const { name } = context.validatedData; // Already validated and typed!

  return {
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    },
  };
}
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

### Usage Examples

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
/**
 * CLI version information
 */
export const version = "2.1.3"

export const metadata = {
  name: "super-cli",
  version: "2.1.3",
  description: "The ultimate command line interface for developers",
  author: "TypeScript Ninja"
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

This will:
1. Build the project
2. Watch the `app/` directory for changes
3. Automatically regenerate the CLI when files change
4. Hot-reload commands without manual rebuilds

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
- `--cli-name <n>`: CLI name for generated files
- `--output-filename <file>`: Custom output filename

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
interface CommandContext<T = any> {
  validatedData?: T;        // Pre-validated typed data from params.ts
  rawArgs: string[];        // Original raw arguments
  rawOptions: Record<string, any>; // Original raw options
}
```

### Commands without Parameters

For commands that don't need parameters, simply omit the `params.ts` file:

```typescript
// app/status/command.ts
import type { CommandDefinition } from 'decopin-cli';

export default function createCommand(): CommandDefinition {
  return {
    metadata: {
      name: 'status',
      description: 'Show application status',
      examples: ['status']
    },
    handler: async () => {
      console.log('✅ Application is running');
    }
  };
}
```

### Error Handling

```typescript
export default function createCommand(context: CommandContext<UserData>): CommandDefinition<UserData> {
  const { name, email } = context.validatedData;

  return {
    metadata: {
      name: 'create',
      description: 'Create a new user'
    },
    handler: async () => {
      try {
        // Command logic here
        await createUser(name, email);
        console.log('✅ User created successfully!');
      } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    }
  };
}
```

### Async Commands

All commands support async operations:

```typescript
export default function createCommand(context: CommandContext<ApiData>): CommandDefinition<ApiData> {
  const { endpoint } = context.validatedData;

  return {
    metadata: {
      name: 'fetch',
      description: 'Fetch data from API'
    },
    handler: async () => {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(data);
    }
  };
}
```

## 📦 Distribution

### NPM Package

To distribute your CLI as an npm package:

1. **Configure package.json**:
```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./examples/cli.js"
  },
  "files": [
    "examples/",
    "app/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "valibot": "^1.1.0"
  }
}
```

2. **Build and publish**:
```bash
npm run build && npm run build:app
npm publish
```

3. **Global install**:
```bash
npm install -g my-awesome-cli
my-cli hello
```

## 🧪 Testing

decopin-cli includes comprehensive testing capabilities. Run tests with:

```bash
npm test
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Next.js App Router's file-based routing
- Built with TypeScript and modern Node.js features
- Uses valibot for type-safe validation

---

**decopin-cli** - Build CLIs like you build Next.js apps! 🚀
