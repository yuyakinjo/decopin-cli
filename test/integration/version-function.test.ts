import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

// CLIを実行するヘルパー関数
async function runCLI(args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync(
      'node',
      ['examples/cli.js', ...args],
      {
        cwd: process.cwd(),
      }
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.code || 1,
    };
  }
}

describe('Version Function Pattern Integration Tests', () => {
  it('should show version from function pattern', async () => {
    const result = await runCLI(['--version']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('2.1.3');
    expect(result.stderr).toBe('');
  });

  it('should show version with -v flag', async () => {
    const result = await runCLI(['-v']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('2.1.3');
    expect(result.stderr).toBe('');
  });

  it('should show version metadata in help', async () => {
    const result = await runCLI(['--help']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('super-cli 2.1.3');
    expect(result.stdout).toContain('The ultimate command line interface for developers');
    expect(result.stdout).toContain('Author: TypeScript Ninja');
  });

  it('should show version metadata when no arguments provided', async () => {
    const result = await runCLI([]);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('super-cli 2.1.3');
    expect(result.stdout).toContain('The ultimate command line interface for developers');
  });

  it('should prioritize version.ts over package.json', async () => {
    // This test verifies that the version from version.ts (2.1.3) is used
    // instead of the version in package.json (0.2.0)
    const result = await runCLI(['--version']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('2.1.3');
    expect(result.stdout).not.toContain('0.2.0');
  });
});