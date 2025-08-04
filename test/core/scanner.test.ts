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

      expect(result).toMatchObject({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
      expect(result.handlers.size).toBe(0);
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
      
      // Check new handler management
      expect(result.handlers.has('command')).toBe(true);
      const commandHandler = result.handlers.get('command');
      expect(commandHandler?.path).toBe(join(appDir, 'command.ts'));
      expect(commandHandler?.definition.name).toBe('command');
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
      
      // Check new handler management
      expect(result.handlers.has('hello/command')).toBe(true);
      const commandHandler = result.handlers.get('hello/command');
      expect(commandHandler?.path).toBe(join(helloDir, 'command.ts'));
      expect(commandHandler?.commandPath).toBe('hello');
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
      
      // Check new handler management
      expect(result.handlers.has('hello/params')).toBe(true);
      const paramsHandler = result.handlers.get('hello/params');
      expect(paramsHandler?.path).toBe(join(helloDir, 'params.ts'));
      expect(paramsHandler?.definition.name).toBe('params');
    });

    it('should find help.ts files', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'help.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.help).toHaveLength(1);
      expect(result.help[0]).toEqual({
        path: join(appDir, 'help.ts'),
        commandPath: ''
      });
      
      // Check new handler management
      expect(result.handlers.has('help')).toBe(true);
    });

    it('should find error.ts files', async () => {
      const appDir = join(tempDir, 'app');
      const userDir = join(appDir, 'user');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        path: join(userDir, 'error.ts'),
        commandPath: 'user'
      });
      
      // Check new handler management
      expect(result.handlers.has('user/error')).toBe(true);
    });

    it('should find middleware.ts in root', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'middleware.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.middleware).toEqual({
        path: join(appDir, 'middleware.ts')
      });
      
      // Check new handler management
      expect(result.handlers.has('middleware')).toBe(true);
      const middlewareHandler = result.handlers.get('middleware');
      expect(middlewareHandler?.path).toBe(join(appDir, 'middleware.ts'));
      expect(middlewareHandler?.definition.scope).toBe('global');
    });

    it('should find global-error.ts in root', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'global-error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.globalError).toEqual({
        path: join(appDir, 'global-error.ts')
      });
      
      // Check new handler management
      expect(result.handlers.has('global-error')).toBe(true);
      const globalErrorHandler = result.handlers.get('global-error');
      expect(globalErrorHandler?.path).toBe(join(appDir, 'global-error.ts'));
      expect(globalErrorHandler?.definition.scope).toBe('global');
    });

    it('should find env.ts in root', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'env.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.env).toEqual({
        path: join(appDir, 'env.ts')
      });
      
      // Check new handler management
      expect(result.handlers.has('env')).toBe(true);
    });

    it('should find version.ts in root', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      writeFileSync(join(appDir, 'version.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result.version).toEqual({
        path: join(appDir, 'version.ts')
      });
      
      // Check new handler management
      expect(result.handlers.has('version')).toBe(true);
    });
  });

  describe('hasCommands()', () => {
    it('should return false when no commands exist', () => {
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

      expect(result).toMatchObject({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
      expect(result.handlers.size).toBe(0);
    });

    it('should handle directories with only subdirectories', async () => {
      const appDir = join(tempDir, 'app');
      const emptyDir1 = join(appDir, 'empty1');
      const emptyDir2 = join(appDir, 'empty2');
      mkdirSync(emptyDir1, { recursive: true });
      mkdirSync(emptyDir2, { recursive: true });

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      expect(result).toMatchObject({
        commands: [],
        params: [],
        help: [],
        errors: []
      });
      expect(result.handlers.size).toBe(0);
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
      expect(result.params).toHaveLength(1);
      expect(result.help).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      
      // Check handler management
      expect(result.handlers.size).toBe(6); // 3 commands + 1 params + 1 help + 1 error
      expect(result.handlers.has('command')).toBe(true);
      expect(result.handlers.has('user/create/command')).toBe(true);
      expect(result.handlers.has('user/create/params')).toBe(true);
      expect(result.handlers.has('user/update/command')).toBe(true);
      expect(result.handlers.has('user/update/help')).toBe(true);
      expect(result.handlers.has('user/update/error')).toBe(true);
    });
  });

  describe('handler registry integration', () => {
    it('should detect all global handlers when present', async () => {
      const appDir = join(tempDir, 'app');
      mkdirSync(appDir, { recursive: true });
      
      // Create all global handlers
      writeFileSync(join(appDir, 'global-error.ts'), 'export default function() {}');
      writeFileSync(join(appDir, 'env.ts'), 'export default function() {}');
      writeFileSync(join(appDir, 'version.ts'), 'export default function() {}');
      writeFileSync(join(appDir, 'middleware.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      // Check new handler management
      expect(result.handlers.size).toBe(4);
      expect(result.handlers.has('global-error')).toBe(true);
      expect(result.handlers.has('env')).toBe(true);
      expect(result.handlers.has('version')).toBe(true);
      expect(result.handlers.has('middleware')).toBe(true);
      
      // Verify all are global scope
      for (const [_, handler] of result.handlers) {
        expect(handler.definition.scope).toBe('global');
      }
    });

    it('should detect all command handlers in a complete command', async () => {
      const appDir = join(tempDir, 'app');
      const helloDir = join(appDir, 'hello');
      mkdirSync(helloDir, { recursive: true });
      
      // Create all command handlers
      writeFileSync(join(helloDir, 'command.ts'), 'export default async function() {}');
      writeFileSync(join(helloDir, 'params.ts'), 'export default function() {}');
      writeFileSync(join(helloDir, 'help.ts'), 'export default function() {}');
      writeFileSync(join(helloDir, 'error.ts'), 'export default function() {}');

      const scanner = new Scanner(appDir);
      const result = await scanner.scan();

      // Check new handler management
      expect(result.handlers.size).toBe(4);
      expect(result.handlers.has('hello/command')).toBe(true);
      expect(result.handlers.has('hello/params')).toBe(true);
      expect(result.handlers.has('hello/help')).toBe(true);
      expect(result.handlers.has('hello/error')).toBe(true);
      
      // Verify all are command scope
      for (const [_, handler] of result.handlers) {
        expect(handler.definition.scope).toBe('command');
        expect(handler.commandPath).toBe('hello');
      }
    });
  });
});