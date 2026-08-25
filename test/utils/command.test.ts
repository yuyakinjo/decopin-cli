import {
  describe,
  expect,
  it,
  mock,
  beforeEach,
  afterEach,
  spyOn,
} from 'bun:test';

import type { AppEnv } from '../../app/env.js';
import type { CommandContext } from '../../dist/types/command.js';

describe('command.ts files', () => {
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // console.logをモック
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // モックをリセット
    consoleSpy.mockRestore();
  });

  describe('hello/command.ts', () => {
    it('should export default function that is a command handler', async () => {
      const commandModule = await import('../../app/hello/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      // コマンドハンドラーは直接関数として呼び出し可能
      const commandHandler = commandModule.default;
      expect(commandHandler).toBeDefined();
      expect(typeof commandHandler).toBe('function');
    });

    it('should handle validated data correctly', async () => {
      const commandModule = await import('../../app/hello/command.js');

      const mockContext: CommandContext<{ name: string }> = {
        validatedData: { name: 'World' },
        args: ['World'],
        options: {},
        params: {},
        showHelp: mock(),
      };

      // コマンドハンドラーを直接実行
      await commandModule.default(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('Hello, World!!!');
    });

    it('should use validated data from context', async () => {
      const commandModule = await import('../../app/hello/command.js');

      const mockContext: CommandContext<{ name: string }> = {
        validatedData: { name: 'TypeScript' },
        args: ['TypeScript'],
        options: {},
        params: {},
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('Hello, TypeScript!!!');
    });
  });

  describe('user/create/command.ts', () => {
    it('should export default function that is a command handler', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      // コマンドハンドラーは直接関数として呼び出し可能
      const commandHandler = commandModule.default;
      expect(commandHandler).toBeDefined();
      expect(typeof commandHandler).toBe('function');
    });

    it('should create user with validated data', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      const mockContext: CommandContext<{ name: string; email: string }> = {
        validatedData: { name: 'John Doe', email: 'john@example.com' },
        args: ['John Doe', 'john@example.com'],
        options: {},
        params: {},
        env: {
          API_KEY: 'test-api-key-123456',
          NODE_ENV: 'test',
          PORT: 3000,
          DEBUG: false,
        },
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔄 Creating user: John Doe (john@example.com)'
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ User created successfully!');
    });

    it('should handle different user data correctly', async () => {
      const commandModule = await import('../../app/user/create/command.js');

      const mockContext: CommandContext<
        { name: string; email: string },
        AppEnv
      > = {
        validatedData: { name: 'Jane Smith', email: 'jane.smith@company.com' },
        args: ['Jane Smith', 'jane.smith@company.com'],
        options: {},
        params: {},
        env: {
          API_KEY: 'test-api-key-123456',
          NODE_ENV: 'test',
          PORT: 3000,
          DEBUG: false,
        },
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔄 Creating user: Jane Smith (jane.smith@company.com)'
      );
      expect(consoleSpy).toHaveBeenCalledWith('✅ User created successfully!');
    });
  });

  describe('user/list/command.ts', () => {
    it('should export default function that is a command handler', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      expect(commandModule.default).toBeDefined();
      expect(typeof commandModule.default).toBe('function');

      // コマンドハンドラーは直接関数として呼び出し可能
      const commandHandler = commandModule.default;
      expect(commandHandler).toBeDefined();
      expect(typeof commandHandler).toBe('function');
    });

    it('should list users with default limit', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext<{ limit: number }> = {
        validatedData: { limit: 10 },
        args: [],
        options: {},
        params: {},
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      // デフォルトのlimit = 10でリストが表示される
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');

      // 10ユーザーが表示される
      for (let i = 1; i <= 10; i++) {
        expect(consoleSpy).toHaveBeenCalledWith(
          `  ${i}. User ${i} (user${i}@example.com)`
        );
      }

      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });

    it('should list users with custom limit option', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext<{ limit: number }> = {
        validatedData: { limit: 5 },
        args: [],
        options: { limit: '5' },
        params: {},
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');

      // 5ユーザーのみが表示される
      for (let i = 1; i <= 5; i++) {
        expect(consoleSpy).toHaveBeenCalledWith(
          `  ${i}. User ${i} (user${i}@example.com)`
        );
      }

      // 6番目以降は表示されない
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '  6. User 6 (user6@example.com)'
      );

      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 5 users');
    });

    it('should handle non-numeric limit gracefully', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext<{ limit: number }> = {
        validatedData: { limit: 10 },
        args: [],
        options: { limit: 'invalid' },
        params: {},
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      // 無効なlimitの場合はデフォルトの10になる
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');
      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });

    it('should handle zero limit option', async () => {
      const commandModule = await import('../../app/user/list/command.js');

      const mockContext: CommandContext<{ limit: number }> = {
        validatedData: { limit: 10 },
        args: [],
        options: { limit: '0' },
        params: {},
        showHelp: mock(),
      };

      await commandModule.default(mockContext);

      // limitが0の場合はデフォルトの10になる
      expect(consoleSpy).toHaveBeenCalledWith('📋 User List:');
      // 最後にサマリーが表示される
      expect(consoleSpy).toHaveBeenCalledWith('\n📊 Showing 10 users');
    });
  });
});
