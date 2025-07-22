import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const CLI_PATH = join(process.cwd(), 'examples', 'cli.js');

/**
 * CLIコマンドを実行してoutputとexit codeを取得
 */
async function runCLI(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
      });
    });
  });
}

describe('Generated CLI Integration Tests', () => {
  beforeAll(async () => {
    // Ensure CLI is built and available
    const { existsSync } = await import('node:fs');
    if (!existsSync(CLI_PATH)) {
      throw new Error(`CLI not found at ${CLI_PATH}. Run 'npm run dev:regen' first.`);
    }
  });

  describe('Hello Command', () => {
    it('should show default greeting', async () => {
      const result = await runCLI(['hello']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, World!!!');
      expect(result.stderr).toBe('');
    });

    it('should accept positional argument', async () => {
      const result = await runCLI(['hello', 'Alice']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, Alice!!!');
      expect(result.stderr).toBe('');
    });

    it('should accept named option', async () => {
      const result = await runCLI(['hello', '--name', 'Bob']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, Bob!!!');
      expect(result.stderr).toBe('');
    });

    it('should handle quoted names', async () => {
      const result = await runCLI(['hello', 'John Doe']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, John Doe!!!');
      expect(result.stderr).toBe('');
    });
  });

  describe('User Create Command', () => {
    it('should create user with positional arguments', async () => {
      const result = await runCLI(['user', 'create', 'John Doe', 'john@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: John Doe (john@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should create user with named options', async () => {
      const result = await runCLI(['user', 'create', '--name', 'Jane Smith', '--email', 'jane@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: Jane Smith (jane@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should create user with mixed arguments', async () => {
      const result = await runCLI(['user', 'create', 'Bob', '--email', 'bob@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: Bob (bob@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should handle missing email gracefully', async () => {
      const result = await runCLI(['user', 'create', '--name', 'Alice']);

      expect(result.exitCode).toBe(1); // バリデーションエラーでexit code 1
      expect(result.stderr).toContain('❌ User creation failed:');
      expect(result.stderr).toContain('email: Invalid type: Expected string but received undefined');
      expect(result.stderr).toContain('💡 Usage examples:');
    });
  });

  describe('User List Command', () => {
    it('should list users with default limit', async () => {
      const result = await runCLI(['user', 'list']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('📋 User List:');
      expect(result.stdout).toContain('📊 Showing 10 users');
      expect(result.stdout).toContain('1. User 1 (user1@example.com)');
      expect(result.stdout).toContain('10. User 10 (user10@example.com)');
      expect(result.stderr).toBe('');
    });

    it('should respect limit option', async () => {
      const result = await runCLI(['user', 'list', '--limit', '5']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('📋 User List:');
      expect(result.stdout).toContain('📊 Showing 5 users');
      expect(result.stdout).toContain('1. User 1 (user1@example.com)');
      expect(result.stdout).toContain('5. User 5 (user5@example.com)');
      expect(result.stdout).not.toContain('6. User 6');
      expect(result.stderr).toBe('');
    });

    it('should handle custom limit values', async () => {
      const result = await runCLI(['user', 'list', '--limit', '3']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('📊 Showing 3 users');
      expect(result.stdout).toContain('3. User 3 (user3@example.com)');
      expect(result.stdout).not.toContain('4. User 4');
      expect(result.stderr).toBe('');
    });
  });

  describe('System Commands', () => {
    it('should show help when --help is used', async () => {
      const result = await runCLI(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('super-cli 2.1.3');
      expect(result.stdout).toContain('The ultimate command line interface for developers');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('cli <command> [options]');
      expect(result.stdout).toContain('Available commands:');
      expect(result.stdout).toContain('hello');
      expect(result.stdout).toContain('user/create');
      expect(result.stdout).toContain('user/list');
      expect(result.stdout).toContain('Author: TypeScript Ninja');
      expect(result.stderr).toBe('');
    });

    it('should show help when -h is used', async () => {
      const result = await runCLI(['-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('super-cli 2.1.3');
      expect(result.stdout).toContain('Available commands:');
      expect(result.stderr).toBe('');
    });

    it('should show help when no arguments are provided', async () => {
      const result = await runCLI([]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('super-cli 2.1.3');
      expect(result.stdout).toContain('Usage:');
      expect(result.stderr).toBe('');
    });

    it('should show version when --version is used', async () => {
      const result = await runCLI(['--version']);

      expect(result.exitCode).toBe(0);
      // Note: Current implementation shows full help instead of just version
      expect(result.stdout).toContain('2.1.3');
      expect(result.stderr).toBe('');
    });

    it('should show version when -v is used', async () => {
      const result = await runCLI(['-v']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2.1.3');
      expect(result.stderr).toBe('');
    });
  });

  describe('Command-Specific Help', () => {
    it('should show detailed help for commands with help.ts (hello command)', async () => {
      const result = await runCLI(['hello', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli hello');
      expect(result.stdout).toContain('Say hello to someone');
      expect(result.stdout).toContain('Examples:');
      expect(result.stdout).toContain('cli hello Alice');
      expect(result.stdout).toContain('cli hello --name Bob');
      expect(result.stdout).toContain('cli hello "Alice Smith"');
      expect(result.stdout).toContain('Aliases: hi, greet');
      expect(result.stdout).toContain('This command greets a person with a friendly hello message.');
      expect(result.stderr).toBe('');
    });

    it('should show detailed help for commands with help.ts using -h flag', async () => {
      const result = await runCLI(['hello', '-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli hello');
      expect(result.stdout).toContain('Say hello to someone');
      expect(result.stdout).toContain('Examples:');
      expect(result.stdout).toContain('Aliases: hi, greet');
      expect(result.stdout).toContain('This command greets a person with a friendly hello message.');
      expect(result.stderr).toBe('');
    });

    it('should show basic help for commands without help.ts (test/basic command)', async () => {
      const result = await runCLI(['test', 'basic', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli test/basic');
      // Should not contain detailed metadata since no help.ts exists
      expect(result.stdout).not.toContain('Examples:');
      expect(result.stdout).not.toContain('Aliases:');
      expect(result.stdout).not.toContain('Description:');
      expect(result.stderr).toBe('');
    });

    it('should show basic help for commands without help.ts using -h flag', async () => {
      const result = await runCLI(['test', 'basic', '-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli test/basic');
      // Should not contain detailed metadata since no help.ts exists
      expect(result.stdout).not.toContain('Examples:');
      expect(result.stdout).not.toContain('Aliases:');
      expect(result.stderr).toBe('');
    });

    it('should show general help for unknown commands with --help', async () => {
      const result = await runCLI(['unknown', '--help']);

      expect(result.exitCode).toBe(0);
      // Should show general help since command doesn't exist
      expect(result.stdout).toContain('super-cli 2.1.3');
      expect(result.stdout).toContain('The ultimate command line interface for developers');
      expect(result.stdout).toContain('Available commands:');
      expect(result.stdout).toContain('hello');
      expect(result.stdout).toContain('user/create');
      expect(result.stderr).toBe('');
    });

    it('should show params.ts argument info for commands without help.ts', async () => {
      const result = await runCLI(['test', 'validation', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli test/validation');
      expect(result.stdout).toContain('Arguments:');
      expect(result.stdout).toContain('[1] message (or --message)');
      expect(result.stdout).toContain('[2] count (or --count)');
      // Should not contain detailed metadata since no help.ts exists
      expect(result.stdout).not.toContain('Examples:');
      expect(result.stdout).not.toContain('Aliases:');
      expect(result.stderr).toBe('');
    });

    it('should show both help.ts and params.ts info for commands with both files', async () => {
      const result = await runCLI(['hello', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli hello');
      // help.ts content
      expect(result.stdout).toContain('Say hello to someone');
      expect(result.stdout).toContain('Examples:');
      expect(result.stdout).toContain('cli hello Alice');
      expect(result.stdout).toContain('Aliases: hi, greet');
      expect(result.stdout).toContain('This command greets a person with a friendly hello message.');
      // params.ts content
      expect(result.stdout).toContain('Arguments:');
      expect(result.stdout).toContain('[1] name (or --name)');
      expect(result.stderr).toBe('');
    });

    it('should show params.ts argument info with multiple fields', async () => {
      const result = await runCLI(['test', 'custom-error', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli test/custom-error');
      expect(result.stdout).toContain('Arguments:');
      expect(result.stdout).toContain('[1] input (or --input)');
      expect(result.stderr).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands', async () => {
      const result = await runCLI(['unknown']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command: unknown');
      expect(result.stderr).toContain('Use --help to see available commands');
      expect(result.stdout).toBe('');
    });

    it('should handle invalid subcommands', async () => {
      const result = await runCLI(['user', 'invalid']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command: user invalid');
      expect(result.stderr).toContain('Use --help to see available commands');
      expect(result.stdout).toBe('');
    });

    it('should handle nested unknown commands', async () => {
      const result = await runCLI(['user', 'create', 'extra', 'args']);

      // "args" is not a valid email, so validation should fail
      expect(result.exitCode).toBe(1); // バリデーションエラーでexit code 1
      expect(result.stderr).toContain('❌ User creation failed:');
      expect(result.stderr).toContain('email: Invalid email format');
    });
  });

  describe('Command Structure Validation', () => {
    it('should handle all available commands', async () => {
      // Get help to see available commands
      const helpResult = await runCLI(['--help']);
      const helpOutput = helpResult.stdout;

      // Extract command names from help output
      const commandMatches = helpOutput.match(/Available commands:\s*([\s\S]*?)\s*Options:/);
      expect(commandMatches).toBeTruthy();

      if (commandMatches) {
        const commandsSection = commandMatches[1];
        expect(commandsSection).toContain('hello');
        expect(commandsSection).toContain('user/create');
        expect(commandsSection).toContain('user/list');
      }
    });

    it('should maintain consistent output format across commands', async () => {
      const commands = [
        ['hello'],
        ['user', 'create', 'Test', 'test@example.com'],
        ['user', 'list', '--limit', '1']
      ];

      for (const command of commands) {
        const result = await runCLI(command);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
        expect(result.stdout).toBeTruthy();
      }
    });
  });

  describe('Alias Functionality', () => {
    it('should execute hello command using "hi" alias', async () => {
      const result = await runCLI(['hi', 'World']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, World!!!');
      expect(result.stderr).toBe('');
    });

    it('should execute hello command using "greet" alias', async () => {
      const result = await runCLI(['greet', 'Alice']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, Alice!!!');
      expect(result.stderr).toBe('');
    });

    it('should execute hello command using "hi" alias with --name option', async () => {
      const result = await runCLI(['hi', '--name', 'Bob']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, Bob!!!');
      expect(result.stderr).toBe('');
    });

    it('should execute user create command using "add" alias', async () => {
      const result = await runCLI(['user', 'add', 'John Doe', 'john@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: John Doe (john@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should execute user create command using "new" alias', async () => {
      const result = await runCLI(['user', 'new', 'Jane Smith', 'jane@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: Jane Smith (jane@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should execute user create command using alias with options', async () => {
      const result = await runCLI(['user', 'add', '--name', 'Alice', '--email', 'alice@example.com']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🔄 Creating user: Alice (alice@example.com)');
      expect(result.stdout).toContain('✅ User created successfully!');
      expect(result.stderr).toBe('');
    });

    it('should show help for command using alias', async () => {
      const result = await runCLI(['hi', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli hello');
      expect(result.stdout).toContain('Say hello to someone');
      expect(result.stdout).toContain('Aliases: hi, greet');
      expect(result.stderr).toBe('');
    });

    it('should show help for user create using alias', async () => {
      const result = await runCLI(['user', 'add', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: cli user/create');
      expect(result.stdout).toContain('Create a new user in the system');
      expect(result.stdout).toContain('Aliases: add, new');
      expect(result.stderr).toBe('');
    });

    it('should handle validation errors with aliases', async () => {
      const result = await runCLI(['user', 'add', 'OnlyName']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ User creation failed:');
      expect(result.stderr).toContain('email: Invalid type: Expected string but received undefined');
      expect(result.stderr).toContain('💡 Usage examples:');
    });

    it('should handle unknown aliases gracefully', async () => {
      const result = await runCLI(['user', 'unknown-alias']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command: user unknown-alias');
      expect(result.stderr).toContain('Use --help to see available commands');
      expect(result.stdout).toBe('');
    });
  });
});