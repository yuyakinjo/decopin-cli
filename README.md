# decopin-cli

A TypeScript-first CLI builder inspired by Next.js App Router's file-based routing system. Create powerful command-line interfaces with zero configuration using familiar file-based conventions.

## ✨ Features

- **📁 File-based routing**: Commands defined in `app/` directory with intuitive folder structure
- **🔧 TypeScript-first**: Full TypeScript support with proper type definitions
- **⚡ Dynamic imports**: Generated CLIs use dynamic imports for instant command loading
- **🔍 AST parsing**: TypeScript AST parsing for automatic command metadata extraction
- **🛡️ Type-safe**: Built-in validation with valibot for robust argument parsing
- **🔄 Real-time development**: Changes reflect instantly without restarts
- **📦 Zero configuration**: Works out of the box with sensible defaults
- **🧪 Comprehensive testing**: Full test coverage with Vitest

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
npm install decopin-cli
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

4. **Generate your CLI**:
```bash
npx decopin-cli build
```

5. **Test your CLI**:
```bash
node dist/cli.js hello
# Output: Hello, World!

node dist/cli.js hello --name Alice
# Output: Hello, Alice!
```

## 📁 File Structure

```
my-cli/
├── app/                    # Commands directory
│   ├── version.ts         # Version configuration (optional)
│   ├── hello/
│   │   └── command.ts     # Simple command
│   ├── user/
│   │   ├── create/
│   │   │   └── command.ts # Nested command: user create
│   │   └── list/
│   │       └── command.ts # Nested command: user list
│   └── database/
│       ├── migrate/
│       │   └── command.ts # Nested command: database migrate
│       └── seed/
│           └── command.ts # Nested command: database seed
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

### Advanced Command with Options

```typescript
// app/user/create/command.ts
export default {
  metadata: {
    name: 'create',
    description: 'Create a new user',
    examples: [
      'user create --name "John Doe" --email john@example.com',
      'user create --name "Jane Smith" --email jane@example.com --admin'
    ]
  },
  handler: async (context: any) => {
    const { name, email, admin } = context.options;

    if (!name || !email) {
      console.error('Error: --name and --email are required');
      process.exit(1);
    }

    console.log(`Creating user: ${name} (${email})`);
    if (admin) {
      console.log('User will have admin privileges');
    }
  }
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

### 1. Watch Mode Development

```bash
# Terminal 1: Watch TypeScript compilation
npm run dev:src    # Watch source files
npm run dev:app    # Watch app directory

# Terminal 2: Development cycle
npm run dev:regen  # Regenerate CLI
npm run dev:test   # Test generated CLI
```

### 2. Real-time Development

Thanks to dynamic imports, changes to your commands are reflected instantly:

```bash
# Make changes to app/hello/command.ts
# The changes are automatically compiled to JavaScript
# Test immediately without restart:
node dist/cli.js hello
```

### 3. Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "decopin-cli build",
    "dev:src": "tsc --watch",
    "dev:app": "tsc app/**/*.ts --watch --outDir app --target es2022 --module es2022 --moduleResolution node",
    "dev:regen": "npm run build && echo 'CLI regenerated!'",
    "dev:test": "node dist/cli.js --help",
    "test": "vitest"
  }
}
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

**Test Coverage:**
- Directory scanning (7 tests)
- AST parsing (7 tests)
- Version parsing (13 tests)
- Integration tests (6 tests)

### Example Test Structure

```typescript
// __tests__/commands.test.ts
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Generated CLI', () => {
  it('should execute hello command', async () => {
    const { stdout } = await execAsync('node dist/cli.js hello');
    expect(stdout.trim()).toBe('Hello, World!');
  });

  it('should execute hello command with name', async () => {
    const { stdout } = await execAsync('node dist/cli.js hello --name Alice');
    expect(stdout.trim()).toBe('Hello, Alice!');
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

## 📦 Distribution

### NPM Package

To distribute your CLI as an npm package:

1. **Configure package.json**:
```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "app/"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

2. **Build and publish**:
```bash
npm run build
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
npm run build
npm test
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by Next.js App Router's file-based routing
- Built with TypeScript and modern Node.js features
- Powered by valibot for type-safe validation

---

  **decopin-cli** - Build CLIs like you build Next.js apps! 🚀
