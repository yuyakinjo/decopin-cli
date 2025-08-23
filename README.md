# decopin-cli

[![npm version](https://img.shields.io/npm/v/decopin-cli)](https://www.npmjs.com/package/decopin-cli)
[![Test](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/test.yml)
[![Integration Tests](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/integration.yml)
[![Build Check](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/build.yml)
[![Lint](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml/badge.svg)](https://github.com/yuyakinjo/decopin-cli/actions/workflows/lint.yml)
[![Performance](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/yuyakinjo/decopin-cli/performance-history/latest-badge.json&query=$.message&label=startup%20time&color=green)](https://github.com/yuyakinjo/decopin-cli/blob/performance-history/latest.md)

A TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. Create powerful command-line interfaces with zero configuration using familiar file-based conventions and pre-validated, type-safe command contexts.

## 🎉 What's New

### v0.5.0 - Major Updates
- **🔄 Simplified ParamsHandler**: No more `type` field needed! The system automatically detects whether you're using `mappings`, `schema`, or both
- **🎯 Context-based architecture**: All handlers now receive a consistent context object with environment variables, args, and options
- **💪 Enhanced validation patterns**: Support for three validation approaches:
  - Mappings-only (with automatic valibot schema generation)
  - Schema-only (for complex validation rules)
  - Combined (schema + mappings for maximum flexibility)
- **🔧 Improved error handling**: Error handlers now receive full context including the error object
- **📝 Better TypeScript support**: Enhanced type inference and discriminated unions

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
- **🔌 Middleware support**: Global middleware for authentication, logging, and cross-cutting concerns
- **🤖 Auto-generated types**: Environment variable types automatically generated from schema definitions

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
    mappings: [
      {
        field: 'name',
        type: 'string',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
        description: 'Name to greet'
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

Defines command argument types, validation schemas, and mapping configurations. The system automatically determines which pattern you're using based on the properties you provide - no explicit `type` field needed!

You can choose between three approaches:

#### Approach 1: Mappings-based Validation (Recommended for most cases)

Automatically generates valibot schemas from mappings with built-in type coercion for CLI inputs:

```typescript
import type { ParamsHandler, Context } from 'decopin-cli';

export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        option: 'name',      // --name option
        argIndex: 0,         // 1st positional argument
        required: true,
        description: 'User name',
      },
      {
        field: 'age',
        type: 'number',      // Automatically converts string to number
        option: 'age',       // --age option
        argIndex: 1,         // 2nd positional argument
        defaultValue: 18,
      },
      {
        field: 'active',
        type: 'boolean',     // Converts "true", "1", "yes" to true
        option: 'active',
        defaultValue: true,
      },
    ],
  };
}
```

**Type coercion rules:**
- `number`: Converts strings to numbers (e.g., "123" → 123)
- `boolean`: Converts "true", "1", "yes" to true, others to false
- `array`: Splits comma-separated strings (e.g., "a,b,c" → ["a", "b", "c"])
- `object`: Parses JSON strings (e.g., '{"key":"value"}' → {key: "value"})

#### Approach 2: Schema-based Validation (For complex validation)

Use valibot schemas directly for detailed validation rules:

```typescript
import * as v from 'valibot';
import type { ParamsHandler, Context } from 'decopin-cli';

const UserSchema = v.object({
  arg0: v.pipe(
    v.string(),
    v.email('Invalid email format'),
    v.endsWith('@company.com', 'Must be a company email')
  ),
  arg1: v.pipe(
    v.string(),
    v.minLength(8, 'Password must be at least 8 characters'),
    v.regex(/[A-Z]/, 'Must contain uppercase letter'),
    v.regex(/[0-9]/, 'Must contain number')
  ),
  role: v.optional(
    v.picklist(['admin', 'user', 'guest'], 'Invalid role'),
    'user'
  )
});

export type UserData = v.InferInput<typeof UserSchema>;

export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    schema: UserSchema,
  };
}
```

#### Approach 3: Combined Pattern (Schema + Mappings)

For complex validation scenarios where you need both custom validation rules and automatic argument mapping:

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
- **Validation Options**: Valibot schema for powerful validation or simple mappings
- **Argument Mapping**: Flexible mapping between positional and option arguments
- **Default Values**: Default value configuration within schema
- **Priority**: Positional arguments → Option arguments → Default values
- **Type Safety**: Full TypeScript support with both patterns

**When to use each pattern:**
- **Mappings**: Best for simple CLIs with straightforward argument handling
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

### `global-error.ts` - Global Error Handling

Defines a global error handler that catches errors from commands without custom error handlers. Place this file in the root `app/` directory.

```typescript
import type { GlobalErrorHandler, CLIError } from 'decopin-cli';
import { isValidationError, isModuleError, hasStackTrace } from 'decopin-cli';

export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    console.error('\n❌ An error occurred\n');
    
    // Type-safe error handling
    if (isValidationError(error)) {
      // Valibot validation error
      console.error('📋 Validation Error:');
      error.issues.forEach((issue) => {
        const path = issue.path?.map(p => p.key).join('.') || 'value';
        console.error(`  • ${path}: ${issue.message}`);
      });
    } else if (isModuleError(error)) {
      // Module loading error
      console.error('📦 Module Error:');
      console.error(`  ${error.message}`);
    } else {
      // Runtime error
      console.error('💥 Error Details:');
      console.error(`  ${error.message}`);
    }
    
    // Show stack trace in debug mode
    if (process.env.DEBUG && hasStackTrace(error)) {
      console.error('\n📍 Stack Trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  };
}
```

**Features:**
- Catches unhandled errors from any command
- Fallback when no command-specific error.ts exists
- Supports debug mode with stack traces
- Type-safe error handling with proper TypeScript types

**Error Types:**
- `ValidationError` - Valibot validation errors with `issues` array
- `ModuleError` - Node.js module loading errors with error `code`
- `Error` - Standard JavaScript/runtime errors
- Type guards available: `isValidationError()`, `isModuleError()`, `hasStackTrace()`

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
import type { VersionHandler } from '../dist/index.js';

export default function createVersion(): VersionHandler {
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

**With Middleware:**
```
app/
├── middleware.ts       # Global middleware (optional)
└── user/
    └── create/
        ├── command.ts  # Main logic
        └── params.ts   # Argument definition
```

**With Global Error Handler:**
```
app/
├── global-error.ts     # Global error handler (optional)
├── middleware.ts       # Global middleware (optional)
└── commands/
    ├── command.ts      # Commands without error.ts use global handler
    └── params.ts
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

### Global Error Handler Example

Create a `global-error.ts` in your app root for centralized error handling:

```typescript
// app/global-error.ts
import type { GlobalErrorHandler, CLIError } from 'decopin-cli';
import { isValidationError, isModuleError } from 'decopin-cli';

export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    // Log errors to file for debugging
    const errorLog = `[${new Date().toISOString()}] ${error.message}\n`;
    await fs.appendFile('cli-errors.log', errorLog).catch(() => {});
    
    // User-friendly error display
    if (isValidationError(error)) {
      console.error('❌ Invalid input provided:');
      error.issues.forEach(issue => {
        console.error(`   - ${issue.message}`);
      });
      console.error('\nRun with --help for usage information.');
    } else {
      console.error('❌ An unexpected error occurred.');
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
    
    process.exit(1);
  };
}
```

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

### Context-Based Architecture

All handlers in decopin-cli follow a consistent context-based pattern, providing a unified interface for accessing command execution information:

#### Handler Patterns

1. **Command Handler** (`command.ts`)
   ```typescript
   export default async function createCommand(context: CommandContext<T, E>) {
     const { validatedData, args, env, options } = context;
     // Direct command implementation
   }
   ```

2. **Params Handler** (`params.ts`)
   ```typescript
   export default function createParams(context: Context<E>): ParamsHandler {
     // Can access environment during initialization
     const { env } = context;
     return {
       mappings: [...] // or schema: ...
     };
   }
   ```

3. **Error Handler** (`error.ts`)
   ```typescript
   export default async function createErrorHandler(context: ErrorContext<T, E>) {
     const { error, validatedData, args, env } = context;
     // Custom error handling with full context
   }
   ```

4. **Middleware Factory** (`middleware.ts`)
   ```typescript
   export default function createMiddleware(context: Context<E>) {
     return async (middlewareContext: MiddlewareContext, next: NextFunction) => {
       // Middleware logic with access to factory context
     };
   }
   ```

5. **Global Error Handler** (`global-error.ts`)
   ```typescript
   export default function createGlobalErrorHandler(context: Context<E>) {
     return async (error: unknown) => {
       // Global error handling with factory context
     };
   }
   ```

#### Context Types

- **Context**: Basic context with args, env, command, and options
- **CommandContext**: Extends Context with validatedData
- **ErrorContext**: Extends CommandContext with error property
- **MiddlewareContext**: Used within middleware execution

### Environment Variables and Type Generation

decopin-cli provides robust environment variable handling with automatic type generation:

#### Defining Environment Variables

Create `app/env.ts` to define your environment schema:

```typescript
import type { EnvHandler } from '../dist/types/index.js';
import { SCHEMA_TYPE } from '../dist/types/index.js';

const envSchema = {
  NODE_ENV: {
    type: SCHEMA_TYPE.STRING,
    required: false,
    default: 'development',
    errorMessage: 'NODE_ENV must be development, production, or test',
  },
  API_KEY: {
    type: SCHEMA_TYPE.STRING,
    required: true,
    minLength: 10,
    errorMessage: 'API_KEY is required and must be at least 10 characters',
  },
  PORT: {
    type: SCHEMA_TYPE.NUMBER,
    required: false,
    default: 3000,
    min: 1000,
    max: 65535,
    errorMessage: 'PORT must be between 1000 and 65535',
  },
} as const;

export default function createEnv(): EnvHandler {
  return envSchema;
}
```

#### Automatic Type Generation

Types are automatically generated during build:

```bash
npm run build              # Types auto-generated to app/generated/env-types.ts
npm run generate:env-types # Manually generate types
```

The generated `app/generated/env-types.ts`:

```typescript
// This file is auto-generated. Do not edit manually.
export interface AppEnv {
  NODE_ENV: string;
  API_KEY: string;
  PORT: number;
}
```

#### Using Environment Variables in Commands

Import the generated type for type-safe environment access:

```typescript
import type { CommandContext } from '../../../dist/types/index.js';
import type { AppEnv } from '../../generated/env-types.js';

export default async function createCommand(context: CommandContext<UserData, AppEnv>) {
  const { API_KEY, NODE_ENV } = context.env;  // Type-safe access
  
  console.log(`Environment: ${NODE_ENV}`);
  // Use API_KEY for authentication...
}
```

**Benefits:**
- **Single source of truth**: Schema defines both validation and types
- **Type safety**: Full TypeScript support for environment variables
- **Auto-sync**: Types always match your schema definition
- **Build-time generation**: No runtime overhead

**Note:** The `app/generated/` directory is automatically excluded from file watching to prevent build loops during development.

### Middleware Support

decopin-cli supports global middleware for cross-cutting concerns like authentication, logging, and error handling. Create `app/middleware.ts` to define middleware that runs before every command:

```typescript
// app/middleware.ts
import type { MiddlewareFactory, MiddlewareContext, NextFunction } from '../dist/types/middleware.js';

const createMiddleware: MiddlewareFactory = () => {
  return async (context: MiddlewareContext<typeof process.env>, next: NextFunction) => {
    // Pre-execution logic
    console.log(`Executing command: ${context.command}`);
    const startTime = Date.now();

    try {
      // Call the next middleware or command
      await next();

      // Post-execution logic
      const duration = Date.now() - startTime;
      console.log(`Command completed in ${duration}ms`);
    } catch (error) {
      // Global error handling
      console.error('Command failed:', error);
      throw error;
    }
  };
};

export default createMiddleware;
```

**Middleware Context:**
```typescript
interface MiddlewareContext<Env> {
  command: string;           // Command path (e.g., 'user/create')
  args: string[];           // Positional arguments
  options: Record<string, string | boolean>; // CLI options
  env: Env;                 // Environment variables
}
```

**Common Middleware Use Cases:**
- **Authentication**: Check auth tokens before command execution
- **Logging**: Log command execution for debugging
- **Performance Monitoring**: Measure command execution time
- **Error Handling**: Centralized error handling and reporting
- **Environment Setup**: Initialize services or configurations

**Example: Authentication Middleware**
```typescript
export default function createMiddleware(): MiddlewareFactory {
  return async (context, next) => {
    // Check for auth flag
    if (context.options.auth) {
      const token = context.env.AUTH_TOKEN;
      if (!token) {
        console.error('❌ Authentication required. Set AUTH_TOKEN environment variable.');
        process.exit(1);
      }
      console.log('✅ Authenticated');
    }

    await next();
  };
}
```

## 🚧 Roadmap & TODO

### Planned Features

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
1. **Shell Autocompletion** - High priority, essential for production CLIs
2. **Lifecycle Hooks** - Medium priority, useful for complex workflows
3. **Advanced Option Features** - Lower priority, nice-to-have features

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
