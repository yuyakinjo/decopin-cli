# decopin-cli

A TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. Create powerful command-line interfaces with zero configuration using familiar file-based conventions.

## ✨ Features

- **📁 File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **🔧 TypeScript-first**: Full TypeScript support with proper type definitions
- **⚡ Dynamic imports**: Generated CLIs use dynamic imports for instant command loading
- **🔍 AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **🛡️ Type-safe validation**: Built-in validation with valibot for robust argument parsing
- **🎯 Flexible argument handling**: Support for both positional arguments and named options
- **🔄 Real-time development**: Changes reflect instantly without restarts
- **📦 Zero configuration**: Works out of the box with sensible defaults
- **🧪 Comprehensive testing**: Full test coverage with 57 tests across 7 test suites

## 🚀 Quick Start

### Installation

```bash
npx decopin-cli
# or
pnpx decopin-cli
# or
bunx decopin-cli
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
export default {
  metadata: {
    name: 'hello',
    description: 'Say hello to someone',
    examples: ['hello world', 'hello --name Alice']
  },
  handler: async (context: any) => {
    const name = context.options.name || context.args[0] || 'World';
    console.log(`Hello, ${name}!`);
  }
};
```

4. **Create `app/hello/params.ts` for type-safe argument validation**:
```typescript
import * as v from 'valibot';

export const schema = v.object({
  name: v.optional(v.string(), 'World')
});

export const fieldMappings = {
  name: { position: 0, option: 'name' }
};
```

5. **Generate your CLI**:
```bash
npx decopin-cli build
```

6. **Test your CLI**:
```bash
node dist/cli.js hello
# Output: Hello, World!

node dist/cli.js hello Alice
# Output: Hello, Alice!

node dist/cli.js hello --name Bob
# Output: Hello, Bob!
```

## 📁 File Structure

```
my-cli/
├── app/                    # Commands directory
│   ├── version.ts         # Version configuration (optional)
│   ├── hello/
│   │   ├── command.ts     # Command implementation
│   │   └── params.ts      # Argument validation (optional)
│   ├── user/
│   │   ├── create/
│   │   │   ├── command.ts # Nested command: user create
│   │   │   └── params.ts  # Validation for user create
│   │   └── list/
│   │       ├── command.ts # Nested command: user list
│   │       └── params.ts  # Validation for user list
│   └── database/
│       ├── migrate/
│       │   ├── command.ts # Nested command: database migrate
│       │   └── params.ts  # Validation for database migrate
│       └── seed/
│           ├── command.ts # Nested command: database seed
│           └── params.ts  # Validation for database seed
├── dist/                  # Generated CLI output
│   └── cli.js            # Your generated CLI
├── src/                   # Source code (if extending)
└── package.json
```

## 🛠️ Command Structure

### Basic Command

```typescript
// app/hello/command.ts
export default {
  metadata: {
    name: 'hello',
    description: 'Say hello to someone',
    examples: [
      'hello world',
      'hello --name Alice'
    ]
  },
  handler: async (context: any) => {
    const name = context.options.name || context.args[0] || 'World';
    console.log(`Hello, ${name}!`);
  }
};
```

### Advanced Command with Type-Safe Validation

```typescript
// app/user/create/command.ts
export default {
  metadata: {
    name: 'create',
    description: 'Create a new user',
    examples: [
      'user create --name "John Doe" --email john@example.com',
      'user create "Jane Smith" jane@example.com --admin'
    ]
  },
  handler: async (context: any) => {
    const { name, email, admin } = context.options;

    console.log(`Creating user: ${name} (${email})`);
    if (admin) {
      console.log('User will have admin privileges');
    }
  }
};
```

```typescript
// app/user/create/params.ts
import * as v from 'valibot';

export const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Valid email is required')),
  admin: v.optional(v.boolean(), false)
});

export const fieldMappings = {
  name: { position: 0, option: 'name' },
  email: { position: 1, option: 'email' },
  admin: { option: 'admin' }
};
```

## 🎯 Argument Handling

decopin-cli supports flexible argument handling with both positional arguments and named options:

### Positional Arguments
```bash
my-cli user create "John Doe" "john@example.com"
```

### Named Options
```bash
my-cli user create --name "John Doe" --email "john@example.com" --admin
```

### Mixed Arguments (positions have higher priority)
```bash
my-cli user create "Jane" --email "jane@example.com" --admin
# name will be "Jane" (from position 0), not from --name option
```

### Validation with valibot

The `params.ts` files use valibot for type-safe validation:

```typescript
import * as v from 'valibot';

export const schema = v.object({
  // Required string with minimum length
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),

  // Required email validation
  email: v.pipe(v.string(), v.email('Valid email is required')),

  // Optional number with default value
  age: v.optional(v.pipe(v.number(), v.minValue(0)), 18),

  // Optional boolean flag
  admin: v.optional(v.boolean(), false)
});

export const fieldMappings = {
  name: { position: 0, option: 'name' },
  email: { position: 1, option: 'email' },
  age: { position: 2, option: 'age' },
  admin: { option: 'admin' }  // Only available as option
};
```

## 🔧 Version Configuration

Create `app/version.ts` to configure your CLI metadata:

```typescript
// app/version.ts
export const version = '1.0.0';
export const name = 'my-awesome-cli';
export const description = 'An awesome CLI built with decopin-cli';
export const author = 'Your Name';
```

## ⚡ Development Workflow

The development experience is designed to be as smooth as Next.js development:

### 1. Quick Development Setup

```bash
# Show development commands
npm run dev

# Terminal 1: Watch source files
npm run dev:src

# Terminal 2: Watch app directory
npm run dev:app

# After changes: Regenerate CLI
npm run dev:regen

# Test generated CLI
npm run dev:test
npm run dev:test:all
```

### 2. Build Commands

```bash
# Build TypeScript source
npm run build

# Build app directory
npm run build:app

# Build everything
npm run build:all
```

### 3. Testing Commands

```bash
# Run all tests (57 tests across 7 suites)
npm test

# Type checking only
npm run test:types

# Unit tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Test app compilation
npm run test:app
```

### 4. Cleaning Commands

```bash
# Clean dist directory
npm run clean

# Clean generated .js files from app directory
npm run clean:app

# Clean generated .js files from src directory
npm run clean:src

# Clean everything
npm run clean:all
```

## 📋 CLI Options

### Build Command

```bash
decopin-cli build [options]
```

**Options:**
- `--output-dir <dir>`: Output directory (default: `dist`)
- `--output-file <file>`: Output filename (default: `cli.js`)
- `--app-dir <dir>`: App directory path (default: `app`)
- `--cli-name <name>`: CLI name for generated file
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

## 🧪 Testing

decopin-cli comes with a comprehensive test suite using Vitest:

```bash
npm test
```

**Test Coverage (57 tests across 7 suites):**
- Directory scanning (6 tests)
- AST parsing (8 tests)
- Version parsing (6 tests)
- Validation utility (9 tests)
- Params validation (9 tests)
- CLI generator (6 tests)
- Integration tests (13 tests)

### Example Test Structure

```typescript
// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { extractData, createValidationFunction } from './validation';
import * as v from 'valibot';

describe('Validation Utils', () => {
  const schema = v.object({
    name: v.optional(v.string(), 'default'),
    age: v.optional(v.number(), 25)
  });

  const fieldMappings = {
    name: { position: 0, option: 'name' },
    age: { position: 1, option: 'age' }
  };

  it('should extract data with positional arguments', () => {
    const result = extractData(['Alice', '30'], {}, fieldMappings, schema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('should extract data with options', () => {
    const result = extractData([], { name: 'Bob', age: '25' }, fieldMappings, schema);
    expect(result).toEqual({ name: 'Bob', age: 25 });
  });
});
```

## 🔍 Advanced Features

### Context Object

Every command handler receives a context object:

```typescript
interface CommandContext {
  args: string[];           // Positional arguments
  options: Record<string, any>; // Named options
  command: string;          // Command name
  subcommand?: string;      // Subcommand name (if nested)
}
```

### Error Handling

```typescript
export default {
  handler: async (context: any) => {
    try {
      // Your command logic here
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
};
```

### Async Commands

All commands support async operations:

```typescript
export default {
  handler: async (context: any) => {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  }
};
```

### TypeScript Configuration

The project uses an optimized TypeScript configuration:

- Separate compilation for `src/` and `app/` directories
- Automatic cleanup of generated JavaScript files
- Incremental compilation for faster builds
- Strict type checking with comprehensive error reporting

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
    "my-cli": "./dist/cli.js"
  },
  "files": [
    "dist/",
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
npm run build:all
npm publish
```

3. **Global installation**:
```bash
npm install -g my-awesome-cli
my-cli hello
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/your-username/decopin-cli.git
cd decopin-cli
npm install
npm run build:all
npm test
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Next.js App Router's file-based routing
- Built with TypeScript and modern Node.js features
- Powered by valibot for type-safe validation
- Comprehensive testing with Vitest

---

  **decopin-cli** - Build CLIs like you build Next.js apps! 🚀
