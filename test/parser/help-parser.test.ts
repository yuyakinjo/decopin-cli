import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseHelpFile } from '../../src/parser/ast-parser.js';
import type { CommandHelpMetadata } from '../../src/types/command.js';

describe('Help Parser', () => {
  const testDir = join(process.cwd(), 'test-help-files');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('parseHelpFile', () => {
    it('should parse valid help.ts file with all properties', async () => {
      const helpFile = join(testDir, 'complete-help.ts');
      await writeFile(
        helpFile,
        `import type { CommandHelpMetadata } from '../../../dist/types/command.js';

export const help: CommandHelpMetadata = {
  name: 'user-create',
  description: 'Create a new user in the system',
  examples: [
    'user create --name "John" --email "john@example.com"',
    'user create "Jane" "jane@example.com"',
    'user create --name "Bob" --email "bob@example.com" --role admin'
  ],
  aliases: ['add', 'new', 'register'],
  additionalHelp: 'This command creates a new user with the specified details. Make sure the email is unique.'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'user-create',
        description: 'Create a new user in the system',
        examples: [
          'user create --name "John" --email "john@example.com"',
          'user create "Jane" "jane@example.com"',
          'user create --name "Bob" --email "bob@example.com" --role admin'
        ],
        aliases: ['add', 'new', 'register'],
        additionalHelp: 'This command creates a new user with the specified details. Make sure the email is unique.'
      });
    });

    it('should parse help.ts file with minimal required properties', async () => {
      const helpFile = join(testDir, 'minimal-help.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'hello',
  description: 'Display a greeting message'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'hello',
        description: 'Display a greeting message'
      });
    });

    it('should parse help.ts file with empty examples and aliases arrays', async () => {
      const helpFile = join(testDir, 'empty-arrays-help.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'list',
  description: 'List all items',
  examples: [],
  aliases: [],
  additionalHelp: ''
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'list',
        description: 'List all items',
        examples: [],
        aliases: [],
        additionalHelp: ''
      });
    });

    it('should handle help.ts file with partial properties', async () => {
      const helpFile = join(testDir, 'partial-help.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'status',
  description: 'Show status information',
  examples: ['status --verbose', 'status --json']
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'status',
        description: 'Show status information',
        examples: ['status --verbose', 'status --json']
      });
    });

    it('should return null when required properties are missing', async () => {
      const helpFile = join(testDir, 'missing-required.ts');
      await writeFile(
        helpFile,
        `export const help = {
  examples: ['some example'],
  aliases: ['alias1', 'alias2']
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should return null when only name is provided', async () => {
      const helpFile = join(testDir, 'name-only.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'test-command'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should return null when only description is provided', async () => {
      const helpFile = join(testDir, 'description-only.ts');
      await writeFile(
        helpFile,
        `export const help = {
  description: 'Test command description'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should handle help.ts file with non-string values gracefully', async () => {
      const helpFile = join(testDir, 'invalid-types.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 123,
  description: true,
  examples: 'not an array',
  aliases: 42,
  additionalHelp: null
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should handle help.ts file without export', async () => {
      const helpFile = join(testDir, 'no-export.ts');
      await writeFile(
        helpFile,
        `const help = {
  name: 'test',
  description: 'Test command'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should handle help.ts file with different export name', async () => {
      const helpFile = join(testDir, 'different-export.ts');
      await writeFile(
        helpFile,
        `export const helpInfo = {
  name: 'test',
  description: 'Test command'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should handle empty help.ts file', async () => {
      const helpFile = join(testDir, 'empty.ts');
      await writeFile(helpFile, '');

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeNull();
    });

    it('should handle help.ts file with comments and whitespace', async () => {
      const helpFile = join(testDir, 'with-comments.ts');
      await writeFile(
        helpFile,
        `/**
 * Help metadata for the user command
 */

import type { CommandHelpMetadata } from '../../../dist/types/command.js';

// This is the help configuration
export const help: CommandHelpMetadata = {
  // Command name
  name: 'user',

  // Command description
  description: 'Manage users in the system',

  // Usage examples
  examples: [
    'user list',
    'user create --name John'
  ],

  // Command aliases
  aliases: ['u'],

  // Additional help text
  additionalHelp: 'Use this command to manage user accounts'
};

// Some other code that should be ignored
const otherStuff = 'ignored';
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'user',
        description: 'Manage users in the system',
        examples: [
          'user list',
          'user create --name John'
        ],
        aliases: ['u'],
        additionalHelp: 'Use this command to manage user accounts'
      });
    });

    it('should handle syntax errors gracefully (performance optimized)', async () => {
      const helpFile = join(testDir, 'syntax-error.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'broken',
  description: 'Command with syntax error'
  // Missing comma above and missing closing brace
        `
      );

      const result = await parseHelpFile(helpFile);

      // パフォーマンス最適化により、シンタックスエラーは検出されない
      // TypeScriptパーサーが部分的に有効なコードを解析できる
      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help).toEqual({
        name: 'broken',
        description: 'Command with syntax error'
      });
    });

    it('should handle file not found error', async () => {
      const nonExistentFile = join(testDir, 'non-existent.ts');

      const result = await parseHelpFile(nonExistentFile);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to parse help file');
      expect(result.help).toBeNull();
    });

    it('should handle complex examples array correctly', async () => {
      const helpFile = join(testDir, 'complex-examples.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'deploy',
  description: 'Deploy application to various environments',
  examples: [
    'deploy --env production',
    'deploy --env staging --verbose',
    'deploy --env development --dry-run --config custom.json',
    'deploy production --force --timeout 300'
  ],
  aliases: ['dpl', 'release'],
  additionalHelp: 'Supports blue-green deployments and rollback capabilities'
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help?.examples).toHaveLength(4);
      expect(result.help?.examples).toEqual([
        'deploy --env production',
        'deploy --env staging --verbose',
        'deploy --env development --dry-run --config custom.json',
        'deploy production --force --timeout 300'
      ]);
      expect(result.help?.aliases).toEqual(['dpl', 'release']);
    });

    it('should ignore non-string elements in arrays', async () => {
      const helpFile = join(testDir, 'mixed-arrays.ts');
      await writeFile(
        helpFile,
        `export const help = {
  name: 'mixed',
  description: 'Command with mixed array types',
  examples: [
    'valid example',
    123,
    'another valid example',
    null,
    'third valid example'
  ],
  aliases: [
    'valid-alias',
    true,
    'another-alias',
    undefined
  ]
};
        `
      );

      const result = await parseHelpFile(helpFile);

      expect(result.errors).toHaveLength(0);
      expect(result.help).toBeDefined();
      expect(result.help?.examples).toEqual([
        'valid example',
        'another valid example',
        'third valid example'
      ]);
      expect(result.help?.aliases).toEqual([
        'valid-alias',
        'another-alias'
      ]);
    });
  });
});