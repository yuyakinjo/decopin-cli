import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Scanner } from '../../src/core/scanner.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Scanner - Global Error', () => {
  let testDir: string;
  let scanner: Scanner;

  beforeEach(async () => {
    testDir = join(tmpdir(), `decopin-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    scanner = new Scanner(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect global-error.ts in root directory', async () => {
    // Create a global-error.ts file
    await writeFile(
      join(testDir, 'global-error.ts'),
      `export default function createGlobalErrorHandler() {
        return async (error) => {
          console.error('Global error:', error);
          process.exit(1);
        };
      }`
    );

    const structure = await scanner.scan();

    expect(structure.globalError).toBeDefined();
    expect(structure.globalError?.path).toBe(join(testDir, 'global-error.ts'));
  });

  it('should work without global-error.ts', async () => {
    // Create a simple command
    await mkdir(join(testDir, 'hello'));
    await writeFile(
      join(testDir, 'hello', 'command.ts'),
      `export default async function() { console.log('Hello'); }`
    );

    const structure = await scanner.scan();

    expect(structure.globalError).toBeUndefined();
    expect(structure.commands).toHaveLength(1);
  });

  it('should detect both middleware and global-error', async () => {
    // Create middleware.ts
    await writeFile(
      join(testDir, 'middleware.ts'),
      `export default function() { return async (ctx, next) => next(); }`
    );

    // Create global-error.ts
    await writeFile(
      join(testDir, 'global-error.ts'),
      `export default function() { return async (error) => console.error(error); }`
    );

    const structure = await scanner.scan();

    expect(structure.middleware).toBeDefined();
    expect(structure.globalError).toBeDefined();
    expect(structure.middleware?.path).toBe(join(testDir, 'middleware.ts'));
    expect(structure.globalError?.path).toBe(join(testDir, 'global-error.ts'));
  });
});