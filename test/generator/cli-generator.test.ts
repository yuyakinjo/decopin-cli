import { describe, expect, it } from 'vitest';
import type { ParsedCommand } from '../../src/types/command.js';
import { generateCLI } from '../../src/generator/cli-generator.js';

describe('CLI Generator - Params Support', () => {
  it('should generate CLI with params mapping', async () => {
    const commands: ParsedCommand[] = [
      {
        path: 'user/create',
        segments: ['user', 'create'],
        filePath: 'app/user/create/command.ts',
        definition: {
          metadata: {
            name: 'create',
            description: 'Create a new user',
          },
          handler: async () => {},
        },
        dynamicParams: [],
      },
    ];

    const config = {
      outputDir: 'dist',
      cliName: 'test-cli',
      appDir: 'app',
      version: '1.0.0',
      description: 'Test CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.mainFile).toBeDefined();
    expect(result.typesFile).toBeDefined();
  });

  it('should generate CLI with multiple commands', async () => {
    const commands: ParsedCommand[] = [
      {
        path: 'user/create',
        segments: ['user', 'create'],
        filePath: 'app/user/create/command.ts',
        definition: {
          metadata: {
            name: 'create',
            description: 'Create a new user',
          },
          handler: async () => {},
        },
        dynamicParams: [],
      },
      {
        path: 'hello',
        segments: ['hello'],
        filePath: 'app/hello/command.ts',
        definition: {
          metadata: {
            name: 'hello',
            description: 'Say hello',
          },
          handler: async () => {},
        },
        dynamicParams: [],
      },
    ];

    const config = {
      outputDir: 'dist',
      cliName: 'test-cli',
      appDir: 'app',
      version: '1.0.0',
      description: 'Test CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.mainFile).toBeDefined();
    expect(result.typesFile).toBeDefined();
  });

  it('should generate CLI with dynamic parameters', async () => {
    const commands: ParsedCommand[] = [
      {
        path: 'user/[id]',
        segments: ['user', '[id]'],
        filePath: 'app/user/[id]/command.ts',
        definition: {
          metadata: {
            name: 'user-detail',
            description: 'Get user details',
          },
          handler: async () => {},
        },
        dynamicParams: [
          {
            name: 'id',
            optional: false,
          },
        ],
      },
    ];

    const config = {
      outputDir: 'dist',
      cliName: 'test-cli',
      appDir: 'app',
      version: '1.0.0',
      description: 'Test CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.mainFile).toBeDefined();
    expect(result.typesFile).toBeDefined();
  });

  it('should generate CLI with empty commands array', async () => {
    const commands: ParsedCommand[] = [];

    const config = {
      outputDir: 'dist',
      cliName: 'test-cli',
      appDir: 'app',
      version: '1.0.0',
      description: 'Test CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.mainFile).toBeDefined();
    expect(result.typesFile).toBeDefined();
  });

  it('should generate CLI with proper config', async () => {
    const commands: ParsedCommand[] = [
      {
        path: 'test',
        segments: ['test'],
        filePath: 'app/test/command.ts',
        definition: {
          metadata: {
            name: 'test',
            description: 'Test command',
          },
          handler: async () => {},
        },
        dynamicParams: [],
      },
    ];

    const config = {
      outputDir: 'dist',
      cliName: 'my-cli',
      appDir: 'app',
      outputFileName: 'custom.js',
      version: '2.0.0',
      description: 'My custom CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.mainFile).toBeDefined();
    expect(result.typesFile).toBeDefined();
  });

  it('should generate proper types file', async () => {
    const commands: ParsedCommand[] = [
      {
        path: 'user/create',
        segments: ['user', 'create'],
        filePath: 'app/user/create/command.ts',
        definition: {
          metadata: {
            name: 'create',
            description: 'Create a new user',
          },
          handler: async () => {},
        },
        dynamicParams: [],
      },
    ];

    const config = {
      outputDir: 'dist',
      cliName: 'test-cli',
      appDir: 'app',
      version: '1.0.0',
      description: 'Test CLI',
    };

    const result = await generateCLI(config, commands);

    expect(result.typesFile).toBeDefined();
    expect(result.files).toContain(result.typesFile);
  });
});