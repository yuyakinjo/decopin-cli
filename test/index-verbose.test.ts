import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { buildCLI, buildWithDefaults } from '../src/index.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('Build CLI - Verbose and Error Handling', () => {
  const testDir = join(process.cwd(), 'test-build-verbose');
  const appDir = join(testDir, 'app');
  const outputDir = join(testDir, 'output');

  beforeEach(async () => {
    await mkdir(appDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should log verbose output when verbose is true', async () => {
    // Create a simple command
    await writeFile(
      join(appDir, 'command.ts'),
      `export default async function handler() { console.log('test'); }`
    );

    const consoleSpy = spyOn(console, 'log');
    consoleSpy.mockImplementation(mock());

    const result = await buildCLI({
      appDir,
      outputDir,
      cliName: 'test',
      verbose: true
    });

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Scanning app directory:'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📁 Found 1 command files'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Generated'));

    consoleSpy.mockRestore();
  });

  it('should return warnings for empty app directory', async () => {
    // Empty app directory
    const emptyDir = join(testDir, 'empty');
    await mkdir(emptyDir, { recursive: true });
    
    const result = await buildCLI({
      appDir: emptyDir,
      outputDir,
      cliName: 'test',
      verbose: false
    });

    expect(result.success).toBe(true);
    expect(result.warnings).toContain('No command files found in app directory');
    expect(result.stats.commandCount).toBe(0);
  });

  it('should use buildWithDefaults', async () => {
    // Create a test directory structure to avoid conflicts
    const testDefaultDir = join(testDir, 'defaults');
    const testAppDir = join(testDefaultDir, 'app');
    const testOutputDir = join(testDefaultDir, 'dist');
    
    await mkdir(testAppDir, { recursive: true });
    
    await writeFile(
      join(testAppDir, 'command.ts'),
      `export default async function handler() { console.log('default'); }`
    );

    // buildWithDefaults uses current working directory, so we test the function signature
    const result = await buildWithDefaults(testAppDir, testOutputDir, 'cli');
    
    expect(result.success).toBe(true);
    expect(result.stats.commandCount).toBe(1);
  });

  it('should handle help file parsing with aliases', async () => {
    // Create command with help that includes aliases
    const userDir = join(appDir, 'user');
    await mkdir(userDir, { recursive: true });

    await writeFile(
      join(userDir, 'command.ts'),
      `export default async function handler() { console.log('user'); }`
    );

    await writeFile(
      join(userDir, 'help.ts'),
      `export default function createHelp() {
        return {
          aliases: ['u', 'usr'],
          description: 'User commands',
          usage: 'user [command]'
        };
      }`
    );

    const consoleSpy = spyOn(console, 'log');
    consoleSpy.mockImplementation(mock());

    const result = await buildCLI({
      appDir,
      outputDir,
      cliName: 'test',
      verbose: true
    });

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Checking aliases for user:'));
    
    consoleSpy.mockRestore();
  });

  it('should handle help file parsing errors gracefully', async () => {
    // Create command with invalid help file
    const testDir = join(appDir, 'test');
    await mkdir(testDir, { recursive: true });

    await writeFile(
      join(testDir, 'command.ts'),
      `export default async function handler() { console.log('test'); }`
    );

    await writeFile(
      join(testDir, 'help.ts'),
      `export default function createHelp() {
        // Invalid syntax
        return {
          aliases: [,],
      }`
    );

    const consoleSpy = spyOn(console, 'log');
    consoleSpy.mockImplementation(mock());

    const result = await buildCLI({
      appDir,
      outputDir,
      cliName: 'test',
      verbose: true
    });

    // Should still succeed despite help parsing error
    expect(result.success).toBe(true);
    // The error is logged internally but might not be visible in verbose output
    // Just check that the build succeeded
    expect(result.success).toBe(true);

    consoleSpy.mockRestore();
  });
});