import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

describe('Global Error Handler Integration', () => {
  const testDir = join(process.cwd(), 'test-global-error-app');
  const cliPath = join(process.cwd(), 'examples/cli.js');

  beforeAll(() => {
    // Create test app directory
    mkdirSync(testDir, { recursive: true });
    
    // Create global-error.ts
    writeFileSync(
      join(testDir, 'global-error.ts'),
      `import type { GlobalErrorHandler, CLIError } from '../dist/types/index.js';
import { isValidationError, isModuleError, hasStackTrace } from '../dist/types/index.js';

export default function createGlobalErrorHandler(): GlobalErrorHandler {
  return async (error: CLIError) => {
    if (isValidationError(error)) {
      console.error('[TEST] Validation error caught by global handler');
      error.issues.forEach((issue) => {
        const path = issue.path?.map(p => p.key).join('.') || 'value';
        console.error(\`[VALIDATION] \${path}: \${issue.message}\`);
      });
    } else if (isModuleError(error)) {
      console.error('[TEST] Module error caught by global handler');
      console.error(\`[MODULE] \${error.code}: \${error.message}\`);
    } else {
      console.error('[TEST] Runtime error caught by global handler');
      console.error(\`[RUNTIME] \${error.message}\`);
    }
    process.exit(1);
  };
}`
    );

    // Create test commands without error handlers
    mkdirSync(join(testDir, 'test-validation'), { recursive: true });
    writeFileSync(
      join(testDir, 'test-validation/command.ts'),
      `import type { CommandContext } from '../../dist/types/index.js';
import type { TestData } from './params.js';

export default async function createCommand(context: CommandContext<TestData>) {
  console.log('This should not run due to validation error');
}`
    );
    
    writeFileSync(
      join(testDir, 'test-validation/params.ts'),
      `import type { ParamsHandler } from 'decopin-cli';

export type TestData = {
  name: string;
  age: number;
};

export default function createParams(): ParamsHandler {
  return {
    schema: {
      name: {
        type: 'string',
        required: true,
        minLength: 1,
        errorMessage: 'Name is required'
      },
      age: {
        type: 'number',
        required: true,
        min: 0,
        max: 150,
        errorMessage: 'Age must be between 0 and 150'
      }
    },
    mappings: [
      { field: 'name', option: 'name' },
      { field: 'age', option: 'age' }
    ]
  };
}`
    );

    // Create runtime error command
    mkdirSync(join(testDir, 'test-runtime'), { recursive: true });
    writeFileSync(
      join(testDir, 'test-runtime/command.ts'),
      `import type { BaseCommandContext } from '../../dist/types/index.js';

export default async function createCommand(context: BaseCommandContext) {
  throw new Error('Test runtime error');
}`
    );

    // Build the test CLI
    execSync(
      `node ${join(process.cwd(), 'dist/cli.js')} build --app-dir ${testDir} --output-dir ${testDir}/dist --cli-name test-cli`,
      { stdio: 'pipe' }
    );
  });

  afterAll(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should handle validation errors with global error handler', () => {
    try {
      execSync(`node ${testDir}/dist/test-cli.js test-validation --name`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain('[TEST] Validation error caught by global handler');
      expect(stderr).toContain('[VALIDATION]');
    }
  });

  it('should handle runtime errors with global error handler', () => {
    try {
      execSync(`node ${testDir}/dist/test-cli.js test-runtime`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain('[TEST] Runtime error caught by global handler');
      expect(stderr).toContain('[RUNTIME] Test runtime error');
    }
  });

  it('should not use global error handler when command has its own error.ts', () => {
    // Create command with custom error handler
    mkdirSync(join(testDir, 'test-custom-error'), { recursive: true });
    writeFileSync(
      join(testDir, 'test-custom-error/command.ts'),
      `import type { CommandContext } from '../../dist/types/index.js';
import type { TestData } from './params.js';

export default async function createCommand(context: CommandContext<TestData>) {
  console.log('This should not run');
}`
    );
    
    writeFileSync(
      join(testDir, 'test-custom-error/params.ts'),
      `import type { ParamsHandler } from 'decopin-cli';

export type TestData = { value: string; };

export default function createParams(): ParamsHandler {
  return {
    schema: {
      value: { type: 'string', required: true, errorMessage: 'Value required' }
    },
    mappings: [{ field: 'value', option: 'value' }]
  };
}`
    );
    
    writeFileSync(
      join(testDir, 'test-custom-error/error.ts'),
      `export default function createErrorHandler() {
  return async (error: any) => {
    console.error('[CUSTOM] Error handled by command-specific handler');
    process.exit(1);
  };
}`
    );

    // Rebuild CLI
    execSync(
      `node ${join(process.cwd(), 'dist/cli.js')} build --app-dir ${testDir} --output-dir ${testDir}/dist --cli-name test-cli`,
      { stdio: 'pipe' }
    );

    try {
      execSync(`node ${testDir}/dist/test-cli.js test-custom-error`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout;
      expect(stderr).toContain('[CUSTOM] Error handled by command-specific handler');
      expect(stderr).not.toContain('[TEST] Validation error caught by global handler');
    }
  });
});