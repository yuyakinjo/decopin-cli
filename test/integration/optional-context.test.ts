import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { Scanner } from '../../src/core/scanner.js';
import { generateLazyCLI } from '../../src/generator/lazy-cli-template.js';

describe('Unified Handler Context System', () => {
  let tempDir: string;
  let appDir: string;
  let outputDir: string;

  // Helper to convert absolute path to relative path for CLI generation
  const toRelativePath = (absolutePath: string, baseDir: string): string => {
    // Convert absolute path to relative and change extension
    const relative = absolutePath.replace(baseDir, '.').replace(/\.ts$/, '.js');
    return relative;
  };

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'decopin-optional-context-'));
    appDir = join(tempDir, 'app');
    outputDir = join(tempDir, 'dist');

    // Create test directories
    execSync(`mkdir -p ${appDir}`);
    execSync(`mkdir -p ${outputDir}`);
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Command Handler', () => {
    it('should support command handler without context when params exist', async () => {
      // Create a command without context
      const commandDir = join(appDir, 'no-context');
      execSync(`mkdir -p ${commandDir}`);

      writeFileSync(join(commandDir, 'command.ts'), `
export default async function noContextCommand() {
  console.log('Command executed without context');
}
      `);

      // Add params to trigger the context checking logic
      writeFileSync(join(commandDir, 'params.ts'), `
export default function createParams() {
  return {
    mappings: [
      {
        field: 'test',
        type: 'string',
        argIndex: 0
      }
    ]
  };
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });

      // With unified handlers, command handlers always receive context
      expect(generated).toContain('await commandHandler(context);');
    });

    it('should support command handler with context', async () => {
      // Create a command with context
      const commandPath = join(appDir, 'with-context', 'command.ts');
      execSync(`mkdir -p ${join(appDir, 'with-context')}`);
      writeFileSync(commandPath, `
import type { CommandContext } from 'decopin-cli';

export default async function withContextCommand(context: CommandContext<{ name: string }>) {
  console.log(\`Hello, \${context.validatedData.name}\`);
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();
      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });

      // Check that the generated code handles context functions
      expect(generated).toContain('await commandHandler(context);');
    });
  });

  describe('Params Handler', () => {
    it('should support params handler without context', async () => {
      // Create params without context
      const paramsPath = join(appDir, 'params-test', 'params.ts');
      const commandPath = join(appDir, 'params-test', 'command.ts');
      execSync(`mkdir -p ${join(appDir, 'params-test')}`);
      writeFileSync(paramsPath, `
export default function createParams() {
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        argIndex: 0,
        required: true
      }
    ]
  };
}
      `);
      writeFileSync(commandPath, `
import type { CommandContext } from 'decopin-cli';

export default async function paramsTestCommand(context: CommandContext<{ name: string }>) {
  console.log(\`Hello, \${context.validatedData.name}\`);
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      // The generated code should check function length
      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('const paramsHandler = paramsModule.default');
    });

    it('should support params handler with context', async () => {
      // Create params with context
      const paramsPath = join(appDir, 'params-context', 'params.ts');
      const commandPath = join(appDir, 'params-context', 'command.ts');
      execSync(`mkdir -p ${join(appDir, 'params-context')}`);
      writeFileSync(paramsPath, `
import type { Context } from 'decopin-cli';

export default function createParams(context: Context) {
  const defaultName = context.env.USER || 'World';
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        argIndex: 0,
        required: true,
        defaultValue: defaultName
      }
    ]
  };
}
      `);
      writeFileSync(commandPath, `
import type { CommandContext } from 'decopin-cli';

export default async function paramsContextCommand(context: CommandContext<{ name: string }>) {
  console.log(\`Hello, \${context.validatedData.name}\`);
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('typeof paramsHandler === \'function\' ? await paramsHandler(context)');
    });
  });

  describe('Error Handler', () => {
    it('should support error handler without context', async () => {
      // Create error handler without context
      const errorPath = join(appDir, 'error-test', 'error.ts');
      const commandPath = join(appDir, 'error-test', 'command.ts');
      execSync(`mkdir -p ${join(appDir, 'error-test')}`);
      writeFileSync(errorPath, `
export default async function errorHandler(error: unknown) {
  console.error('Error:', error);
  process.exit(1);
}
      `);
      writeFileSync(commandPath, `
export default async function errorTestCommand() {
  throw new Error('Test error');
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('await errorHandler({ ...context, error });');
    });

    it('should support error handler with context', async () => {
      // Create error handler with context
      const errorPath = join(appDir, 'error-context', 'error.ts');
      const commandPath = join(appDir, 'error-context', 'command.ts');
      execSync(`mkdir -p ${join(appDir, 'error-context')}`);
      writeFileSync(errorPath, `
import type { ErrorContext } from 'decopin-cli';

export default async function errorHandler(context: ErrorContext<{ name: string }>) {
  console.error('Error in context:', context.error);
  console.error('Args:', context.args);
  process.exit(1);
}
      `);
      writeFileSync(commandPath, `
export default async function errorContextCommand() {
  throw new Error('Test error with context');
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('await errorHandler({ ...context, error });');
    });
  });

  describe('Middleware Handler', () => {
    it('should support middleware factory without context', async () => {
      // Clean up any existing middleware.ts
      const middlewarePath = join(appDir, 'middleware.ts');
      if (existsSync(middlewarePath)) {
        rmSync(middlewarePath);
      }

      // Create middleware without context
      writeFileSync(middlewarePath, `
export default function createMiddleware() {
  return async (context, next) => {
    console.log('Middleware without factory context');
    await next();
  };
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      // In unified system, middleware is loaded as a global handler
      expect(generated).toContain("globalHandlers['middleware'] = middlewareModule.default;");
    });

    it('should support middleware factory with context', async () => {
      // Clean up any existing middleware.ts
      const middlewarePath = join(appDir, 'middleware.ts');
      if (existsSync(middlewarePath)) {
        rmSync(middlewarePath);
      }

      // Create middleware with context
      writeFileSync(middlewarePath, `
import type { Context } from 'decopin-cli';

export default function createMiddleware(context: Context) {
  console.log('Factory context env:', context.env);
  return async (middlewareContext, next) => {
    console.log('Middleware execution');
    await next();
  };
}
      `);

      // Note: This would need to be placed at the right location
      // The test verifies the pattern exists in generated code
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      // Even if this specific file isn't picked up, we verify the pattern
      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      // Middleware execution is handled differently in unified system
      expect(generated).toContain('createMiddleware.length === 0');
    });
  });

  describe('Global Error Handler', () => {
    it('should support global error handler factory without context', async () => {
      // Clean up any existing global-error.ts
      const globalErrorPath = join(appDir, 'global-error.ts');
      if (existsSync(globalErrorPath)) {
        rmSync(globalErrorPath);
      }

      // Create global error handler without context
      writeFileSync(globalErrorPath, `
export default function createGlobalErrorHandler() {
  return async (error) => {
    console.error('Global error:', error);
    process.exit(1);
  };
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('globalErrorModule.default.length === 0');
      expect(generated).toContain('globalErrorModule.default()');
    });

    it('should support global error handler factory with context', async () => {
      // Clean up any existing global-error.ts
      const globalErrorPath = join(appDir, 'global-error.ts');
      if (existsSync(globalErrorPath)) {
        rmSync(globalErrorPath);
      }

      // Create global error handler with context
      writeFileSync(globalErrorPath, `
import type { Context } from 'decopin-cli';

export default function createGlobalErrorHandler(context: Context) {
  const isDev = context.env.NODE_ENV === 'development';
  return async (error) => {
    if (isDev) {
      console.error('Detailed error:', error);
    } else {
      console.error('An error occurred');
    }
    process.exit(1);
  };
}
      `);

      // The test verifies the pattern exists in generated code
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('globalErrorModule.default(baseContext)');
    });
  });

  describe('Version Handler', () => {
    it('should support version handler without context', async () => {
      // Create version handler without context
      const versionPath = join(appDir, 'version.ts');
      writeFileSync(versionPath, `
export default function createVersion() {
  return {
    version: '1.0.0',
    metadata: {
      name: 'test-cli',
      version: '1.0.0'
    }
  };
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('versionModule.default.length === 0');
      expect(generated).toContain('versionModule.default()');
    });

    it('should support version handler with context', async () => {
      // Create version handler with context
      const versionPath = join(appDir, 'version-context.ts');
      writeFileSync(versionPath, `
import type { Context } from 'decopin-cli';

export default function createVersion(context: Context) {
  const env = context.env.NODE_ENV || 'production';
  return {
    version: '1.0.0',
    metadata: {
      name: 'test-cli',
      version: \`1.0.0-\${env}\`
    }
  };
}
      `);

      // The test verifies the pattern exists in generated code
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('versionModule.default({ args: process.argv.slice(2), env: process.env');
    });
  });

  describe('Env Handler', () => {
    it('should support env handler without context', async () => {
      // Create env handler without context
      const envPath = join(appDir, 'env.ts');
      writeFileSync(envPath, `
export default function createEnv() {
  return {
    NODE_ENV: {
      type: 'string',
      required: false,
      default: 'development'
    }
  };
}
      `);

      // Generate and test
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('envModule.default.length === 0');
      expect(generated).toContain('envModule.default()');
    });

    it('should support env handler with context', async () => {
      // Create env handler with context
      const envPath = join(appDir, 'env-context.ts');
      writeFileSync(envPath, `
import type { Context } from 'decopin-cli';

export default function createEnv(context: Context) {
  // Could use context to determine env requirements
  const isCI = context.env.CI === 'true';

  return {
    NODE_ENV: {
      type: 'string',
      required: isCI,
      default: 'development'
    }
  };
}
      `);

      // The test verifies the pattern exists in generated code
      const scanner = new Scanner(appDir);
      const structure = await scanner.scan();

      const generated = generateLazyCLI({
        commands: structure.commands.map(cmd => ({
          name: cmd.name,
          path: toRelativePath(cmd.path, tempDir),
          hasParams: !!cmd.params,
          aliases: cmd.help?.aliases
        })),
        hasParams: structure.params.length > 0,
        hasHelp: structure.commands.some(cmd => !!cmd.help),
        hasError: structure.commands.some(cmd => !!cmd.error),
        hasMiddleware: !!structure.middleware,
        middlewarePath: structure.middleware ? toRelativePath(structure.middleware.path, tempDir) : undefined,
        hasGlobalError: !!structure.globalError,
        globalErrorPath: structure.globalError ? toRelativePath(structure.globalError.path, tempDir) : undefined,
        hasEnv: !!structure.env,
        envPath: structure.env ? toRelativePath(structure.env.path, tempDir) : undefined,
        hasVersion: !!structure.version,
        versionPath: structure.version ? toRelativePath(structure.version.path, tempDir) : undefined,
        structure
      });
      expect(generated).toContain('envModule.default({ args: process.argv.slice(2), env: process.env');
    });
  });
});