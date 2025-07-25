import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Scanner } from '../../src/core/scanner';

describe('Scanner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'scanner-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('scan()', () => {
    it('should return empty structure when app directory does not exist', async () => {
      const scanner = new Scanner(join(tempDir, 'non-existent'));
      const result = await scanner.scan();

      expect(result).toEqual({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
    });

    it('should find command.ts files', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'command.ts'), 'export default async function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        path: join(appDir, 'command.ts'),
        name: 'root'
      });
    });

    it('should find nested command.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      writeFileSync(join(helloDir, 'command.ts'), 'export default async function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        path: join(helloDir, 'command.ts'),
        name: 'hello'
      });
    });

    it('should find deeply nested command.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const userCreateDir = join(appDir, 'user', 'create');
      mkdirSync(userCreateDir, { recursive: true });
      writeFileSync(join(userCreateDir, 'command.ts'), 'export default async function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        path: join(userCreateDir, 'command.ts'),
        name: 'user/create'
      });
    });

    it('should find params.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      writeFileSync(join(helloDir, 'params.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.params).toHaveLength(1);
      expect(result.params[0]).toEqual({
        path: join(helloDir, 'params.ts'),
        commandPath: 'hello'
      });
    });

    it('should find params.ts in root directory', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'params.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.params).toHaveLength(1);
      expect(result.params[0]).toEqual({
        path: join(appDir, 'params.ts'),
        commandPath: ''
      });
    });

    it('should find help.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      writeFileSync(join(helloDir, 'help.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.help).toHaveLength(1);
      expect(result.help[0]).toEqual({
        path: join(helloDir, 'help.ts'),
        commandPath: 'hello'
      });
    });

    it('should find error.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      writeFileSync(join(helloDir, 'error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        path: join(helloDir, 'error.ts'),
        commandPath: 'hello'
      });
    });

    it('should find all types of files in a command directory', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      
      writeFileSync(join(helloDir, 'command.ts'), 'export default async function() {}');
      writeFileSync(join(helloDir, 'params.ts'), 'export default function() {}');
      writeFileSync(join(helloDir, 'help.ts'), 'export default function() {}');
      writeFileSync(join(helloDir, 'error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(1);
      expect(result.params).toHaveLength(1);
      expect(result.help).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should ignore non-TypeScript files', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'readme.md'), '# README');
      writeFileSync(join(appDir, 'config.json'), '{}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(0);
      expect(result.params).toHaveLength(0);
      expect(result.help).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should ignore TypeScript files that are not command/params/help/error', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'utils.ts'), 'export function helper() {}');
      writeFileSync(join(appDir, 'types.ts'), 'export interface Type {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(0);
      expect(result.params).toHaveLength(0);
      expect(result.help).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('hasCommands()', () => {
    it('should return false when app directory does not exist', () => {
      const scanner = new Scanner(join(tempDir, 'non-existent'));
      expect(scanner.hasCommands()).toBe(false);
    });

    it('should return false when no command files exist', () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'params.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      expect(scanner.hasCommands()).toBe(false);
    });

    it('should return true when command files exist', () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'command.ts'), 'export default async function() {}');

      const scanner = new Scanner(appDir);
      expect(scanner.hasCommands()).toBe(true);
    });

    it('should return true when nested command files exist', () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      writeFileSync(join(helloDir, 'command.ts'), 'export default async function() {}');

      const scanner = new Scanner(appDir);
      expect(scanner.hasCommands()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty directories', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result).toEqual({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
    });

    it('should handle directories with only subdirectories', async () => {
      const appDir = join(tempDir, 'app');
      const emptyDir1 = join(appDir, 'empty1');
      const emptyDir2 = join(appDir, 'empty2');
      mkdirSync(emptyDir1, { recursive: true });
      mkdirSync(emptyDir2, { recursive: true });

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result).toEqual({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
    });

    it('should handle mixed file types in nested structures', async () => {
      const appDir = join(tempDir, 'app');
      const userDir = join(appDir, 'user');
      const createDir = join(userDir, 'create');
      const updateDir = join(userDir, 'update');
      
      mkdirSync(createDir, { recursive: true });
      mkdirSync(updateDir, { recursive: true });
      
      // Root level files
      writeFileSync(join(appDir, 'command.ts'), 'export default async function() {}');
      writeFileSync(join(appDir, 'readme.md'), '# App');
      
      // User directory files
      writeFileSync(join(userDir, 'types.ts'), 'export interface User {}');
      
      // Create command files
      writeFileSync(join(createDir, 'command.ts'), 'export default async function() {}');
      writeFileSync(join(createDir, 'params.ts'), 'export default function() {}');
      
      // Update command files
      writeFileSync(join(updateDir, 'command.ts'), 'export default async function() {}');
      writeFileSync(join(updateDir, 'help.ts'), 'export default function() {}');
      writeFileSync(join(updateDir, 'error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.commands).toHaveLength(3);
      expect(result.commands.map(c => c.name)).toContain('root');
      expect(result.commands.map(c => c.name)).toContain('user/create');
      expect(result.commands.map(c => c.name)).toContain('user/update');
      
      expect(result.params).toHaveLength(1);
      expect(result.params[0].commandPath).toBe('user/create');
      
      expect(result.help).toHaveLength(1);
      expect(result.help[0].commandPath).toBe('user/update');
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].commandPath).toBe('user/update');
    });
  });
});