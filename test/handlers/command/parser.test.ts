import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { parseFiles } from '../../../src/handlers/command/parser.js';
import type { CommandFile } from '../../../src/core/types.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('Command Parser - Extended Tests', () => {
  const testDir = join(process.cwd(), 'test-parser-extended');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should parse command with JSDoc description', async () => {
    const commandPath = join(testDir, 'command.ts');
    await writeFile(
      commandPath,
      `/**
       * This is a test command that does something useful
       */
      export default async function handler() {
        console.log('test');
      }`
    );

    const files: CommandFile[] = [{
      path: commandPath,
      commandPath: 'test'
    }];

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('root');
    expect(definitions[0].metadata?.description).toBe('This is a test command that does something useful');
  });

  it('should handle command without metadata', async () => {
    const commandPath = join(testDir, 'command.ts');
    await writeFile(
      commandPath,
      `export default async function handler() {
        console.log('no metadata test');
      }`
    );

    const files: CommandFile[] = [{
      path: commandPath,
      commandPath: 'test'
    }];

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('root');
    expect(definitions[0].metadata).toBeUndefined();
  });

  it('should handle deeply nested command paths', async () => {
    const deepPath = join(testDir, 'app', 'admin', 'users', 'permissions', 'command.ts');
    await mkdir(join(testDir, 'app', 'admin', 'users', 'permissions'), { recursive: true });

    await writeFile(
      deepPath,
      `export default async function handler() {
        console.log('deep command');
      }`
    );

    const files: CommandFile[] = [{
      path: deepPath,
      commandPath: 'admin/users/permissions'
    }];

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('admin/users/permissions');
  });

  it('should handle arrow function exports', async () => {
    const commandPath = join(testDir, 'command.ts');
    await writeFile(
      commandPath,
      `const handler = async () => {
        console.log('arrow function');
      };

      export default handler;`
    );

    const files: CommandFile[] = [{
      path: commandPath,
      commandPath: 'arrow'
    }];

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('root');
  });

  it('should handle multiple handlers correctly', async () => {
    const commandPath = join(testDir, 'command.ts');
    await writeFile(
      commandPath,
      `export function helperFunction() {
        return 'helper';
      }

      export default async function handler() {
        console.log('main handler');
      }`
    );

    const files: CommandFile[] = [{
      path: commandPath,
      commandPath: 'multi'
    }];

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('root');
  });

  it('should parse multiple files in parallel', async () => {
    const files: CommandFile[] = [];

    // Create multiple command files
    for (let i = 0; i < 5; i++) {
      const cmdPath = join(testDir, `command${i}.ts`);
      await writeFile(
        cmdPath,
        `export default async function handler() { console.log('cmd${i}'); }`
      );

      files.push({
        path: cmdPath,
        commandPath: `cmd${i}`
      });
    }

    const definitions = await parseFiles(files);

    expect(definitions).toHaveLength(5);
    definitions.forEach((def) => {
      expect(def.name).toBe('root');
    });
  });
});