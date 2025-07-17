import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { CommandContext, CommandDefinition } from '../../dist/types/command.js';

describe('command.ts files', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // console.logをモック
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // モックをリセット
    consoleSpy.mockRestore();
  });

  describe('hello/command.ts', () => {
    it('should export default function that returns CommandDefinition', async () => {
      const commandModule = await import('../../app/hello/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      // モックコンテキストを作成
      const mockContext: CommandContext<{ name: string }> = {
        validatedData: { name: 'TestUser' },
        args: ['TestUser'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);

      expect(commandDefinition).toBeDefined();
      expect(typeof commandDefinition).toBe('object');
      expect(commandDefinition.handler).toBeDefined();
      expect(typeof commandDefinition.handler).toBe('function');
    });

    it('should handle validated data correctly', async () => {
      const commandModule = await import('../../app/hello/command.js');

      const mockContext: CommandContext<{ name: string }> = {
        validatedData: { name: 'World' },
        args: ['World'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);

      // ハンドラーを実行
      await commandDefinition.handler(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('Hello, World!!!');
    });

    it('should use validated data from context', async () => {
      const commandModule = await import('../../app/hello/command.js');

      const mockContext: CommandContext<{ name: string }> = {
        validatedData: { name: 'TypeScript' },
        args: ['TypeScript'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('Hello, TypeScript!!!');
    });
  });

  describe('user/create/command.ts', () => {
    it('should export default function that returns CommandDefinition', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      const mockContext: CommandContext<{ name: string; email: string }> = {
        validatedData: { name: 'TestUser', email: 'test@example.com' },
        args: ['TestUser', 'test@example.com'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);

      expect(commandDefinition).toBeDefined();
      expect(typeof commandDefinition).toBe('object');
      expect(commandDefinition.handler).toBeDefined();
      expect(typeof commandDefinition.handler).toBe('function');
    });

    it('should create user with validated data', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      const mockContext: CommandContext<{ name: string; email: string }> = {
        validatedData: { name: 'John Doe', email: 'john@example.com' },
        args: ['John Doe', 'john@example.com'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Creating user: John Doe (john@example.com)');
      expect(consoleSpy).toHaveBeenCalledWith('✅ User created successfully!');
    });

    it('should handle different user data correctly', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      const mockContext: CommandContext<{ name: string; email: string }> = {
        validatedData: { name: 'Jane Smith', email: 'jane.smith@company.com' },
        args: ['Jane Smith', 'jane.smith@company.com'],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Creating user: Jane Smith (jane.smith@company.com)');
      expect(consoleSpy).toHaveBeenCalledWith('✅ User created successfully!');
    });
  });

  describe('user/list/command.ts', () => {
    it('should export default function that returns CommandDefinition', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      const mockContext: CommandContext = {
        validatedData: null,
        args: [],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);

      expect(commandDefinition).toBeDefined();
      expect(typeof commandDefinition).toBe('object');
      expect(commandDefinition.handler).toBeDefined();
      expect(typeof commandDefinition.handler).toBe('function');
    });

    it('should list users with default limit', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext = {
        validatedData: null,
        args: [],
        options: {},
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

            // デフォルトのlimit = 10でリストが表示される
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');

      // 10ユーザーが表示される
      for (let i = 1; i <= 10; i++) {
        expect(consoleSpy).toHaveBeenCalledWith(`  ${i}. User ${i} (user${i}@example.com)`);
      }

      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });

    it('should list users with custom limit option', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext = {
        validatedData: null,
        args: [],
        options: { limit: '5' },
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

            expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');

      // 5ユーザーのみが表示される
      for (let i = 1; i <= 5; i++) {
        expect(consoleSpy).toHaveBeenCalledWith(`  ${i}. User ${i} (user${i}@example.com)`);
      }

      // 6番目以降は表示されない
      expect(consoleSpy).not.toHaveBeenCalledWith('  6. User 6 (user6@example.com)');

      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 5 users');
    });

    it('should handle non-numeric limit gracefully', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext = {
        validatedData: null,
        args: [],
        options: { limit: 'invalid' },
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

      // 無効なlimitの場合はデフォルトの10になる
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');
      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });

    it('should handle zero limit option', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext = {
        validatedData: null,
        args: [],
        options: { limit: '0' },
        params: {},
        showHelp: vi.fn()
      };

      const commandDefinition = commandModule.default(mockContext);
      await commandDefinition.handler(mockContext);

      // limitが0の場合はデフォルトの10になる
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');
      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });
  });
});