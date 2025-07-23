import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { scanAppDirectory } from '../../src/scanner/directory-scanner.js';

describe('Directory Scanner', () => {
  const testDir = join(process.cwd(), 'test-app');

  beforeEach(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should scan empty directory', async () => {
    const result = await scanAppDirectory(testDir);
    expect(result).toEqual({ commands: [] });
  });

  it('should find single command file', async () => {
    // Create test command file
    const commandDir = join(testDir, 'hello');
    await mkdir(commandDir, { recursive: true });
    await writeFile(
      join(commandDir, 'command.ts'),
      `
export const metadata = { description: 'Hello command' }
export default function handler() { console.log('Hello!') }
    `
    );

    const result = await scanAppDirectory(testDir);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({
      path: 'hello',
      commandFilePath: join(commandDir, 'command.ts'),
      segments: ['hello'],
      dynamicParams: [],
    });
  });

  it('should find nested command files', async () => {
    // Create nested command structure
    const userCreateDir = join(testDir, 'user', 'create');
    await mkdir(userCreateDir, { recursive: true });
    await writeFile(
      join(userCreateDir, 'command.ts'),
      `
export const metadata = { description: 'Create user' }
export default function handler() { console.log('Create user') }
    `
    );

    const userListDir = join(testDir, 'user', 'list');
    await mkdir(userListDir, { recursive: true });
    await writeFile(
      join(userListDir, 'command.ts'),
      `
export const metadata = { description: 'List users' }
export default function handler() { console.log('List users') }
    `
    );

    const result = await scanAppDirectory(testDir);
    expect(result.commands).toHaveLength(2);

    const paths = result.commands.map((r) => r.path).sort();
    expect(paths).toEqual(['user/create', 'user/list']);
  });

  it('should handle dynamic parameters', async () => {
    // Create dynamic parameter command
    const dynamicDir = join(testDir, 'user', '[id]', 'delete');
    await mkdir(dynamicDir, { recursive: true });
    await writeFile(
      join(dynamicDir, 'command.ts'),
      `
export const metadata = { description: 'Delete user by ID' }
export default function handler() { console.log('Delete user') }
    `
    );

    const result = await scanAppDirectory(testDir);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({
      path: 'user/[id]/delete',
      segments: ['user', '[id]', 'delete'],
      dynamicParams: [{ name: 'id', optional: false }],
    });
  });

  it('should handle multiple dynamic parameters', async () => {
    // Create command with multiple dynamic parameters
    const complexDir = join(
      testDir,
      'org',
      '[orgId]',
      'user',
      '[userId]',
      'edit'
    );
    await mkdir(complexDir, { recursive: true });
    await writeFile(
      join(complexDir, 'command.ts'),
      `
export const metadata = { description: 'Edit user in organization' }
export default function handler() { console.log('Edit user') }
    `
    );

    const result = await scanAppDirectory(testDir);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({
      path: 'org/[orgId]/user/[userId]/edit',
      segments: ['org', '[orgId]', 'user', '[userId]', 'edit'],
      dynamicParams: [
        { name: 'orgId', optional: false },
        { name: 'userId', optional: false },
      ],
    });
  });

  it('should ignore non-command files', async () => {
    // Create various files that should be ignored
    await writeFile(join(testDir, 'README.md'), 'Documentation');
    await writeFile(join(testDir, 'config.json'), '{}');

    const helperDir = join(testDir, 'utils');
    await mkdir(helperDir, { recursive: true });
    await writeFile(
      join(helperDir, 'helper.ts'),
      'export function helper() {}'
    );

    const result = await scanAppDirectory(testDir);
    expect(result).toEqual({ commands: [] });
  });

  it('should ignore directories without command.ts', async () => {
    // Create directory structure without command.ts files
    const emptyDir = join(testDir, 'empty', 'subdir');
    await mkdir(emptyDir, { recursive: true });
    await writeFile(join(emptyDir, 'other.ts'), 'export const other = true');

    const result = await scanAppDirectory(testDir);
    expect(result).toEqual({ commands: [] });
  });
});