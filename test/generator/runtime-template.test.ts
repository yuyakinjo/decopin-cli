import { describe, expect, it } from 'vitest';
import { generateCommandMatcher } from '../../src/generator/runtime-template.js';
import type { ParsedCommand } from '../../src/types/command.js';

describe('Runtime Template', () => {
  describe('generateCommandMatcher', () => {
    it('should generate command matcher with alias support', () => {
      const commands: ParsedCommand[] = [
        {
          path: 'hello',
          segments: ['hello'],
          dynamicParams: [],
          filePath: '/app/hello/command.ts',
          definition: {
            handler: async () => {},
            metadata: {
              name: 'hello',
              description: 'Say hello',
              aliases: ['hi', 'greet'],
            },
          },
        },
        {
          path: 'user/create',
          segments: ['user', 'create'],
          dynamicParams: [],
          filePath: '/app/user/create/command.ts',
          definition: {
            handler: async () => {},
            metadata: {
              name: 'create',
              description: 'Create a user',
              aliases: ['add', 'new'],
            },
          },
        },
      ];

      const result = generateCommandMatcher(commands);

      // Check that the generated code includes alias matching logic
      expect(result).toContain('// まず通常のコマンドマッチングを試行');
      expect(result).toContain('// 通常のマッチングで見つからない場合、エイリアスを確認');
      expect(result).toContain('const aliases = command.definition.metadata?.aliases || []');
      expect(result).toContain('if (aliases.includes(userLastSegment)');
    });

    it('should generate valid JavaScript function', () => {
      const commands: ParsedCommand[] = [
        {
          path: 'test',
          segments: ['test'],
          dynamicParams: [],
          filePath: '/app/test/command.ts',
          definition: {
            handler: async () => {},
            metadata: {
              name: 'test',
              description: 'Test command',
            },
          },
        },
      ];

      const result = generateCommandMatcher(commands);

      // Basic structure validation
      expect(result).toContain('function matchCommand(segments)');
      expect(result).toContain('const availableCommands = [');
      expect(result).toContain('return { command, params }');
      expect(result).toContain('return { command: null, params: {} }');
    });

    it('should handle commands with dynamic parameters', () => {
      const commands: ParsedCommand[] = [
        {
          path: 'user/[id]/edit',
          segments: ['user', '[id]', 'edit'],
          dynamicParams: ['id'],
          filePath: '/app/user/[id]/edit/command.ts',
          definition: {
            handler: async () => {},
            metadata: {
              name: 'edit',
              description: 'Edit user',
            },
          },
        },
      ];

      const result = generateCommandMatcher(commands);

      expect(result).toContain("if (segment.startsWith('[') && segment.endsWith(']'))");
      expect(result).toContain('const paramName = segment.slice(1, -1)');
      expect(result).toContain('params[paramName] = userSegment');
    });

    it('should handle commands without metadata', () => {
      const commands: ParsedCommand[] = [
        {
          path: 'simple',
          segments: ['simple'],
          dynamicParams: [],
          filePath: '/app/simple/command.ts',
          definition: {
            handler: async () => {},
          },
        },
      ];

      const result = generateCommandMatcher(commands);

      // Should handle undefined metadata gracefully
      expect(result).toContain('definition: { metadata: {} }');
    });

    it('should preserve metadata in generated code', () => {
      const commands: ParsedCommand[] = [
        {
          path: 'complex',
          segments: ['complex'],
          dynamicParams: [],
          filePath: '/app/complex/command.ts',
          definition: {
            handler: async () => {},
            metadata: {
              name: 'complex',
              description: 'Complex command',
              examples: ['complex --option value'],
              aliases: ['cplx'],
              additionalHelp: 'Extra help text',
            },
          },
        },
      ];

      const result = generateCommandMatcher(commands);

      // Check that all metadata is preserved in JSON
      expect(result).toContain('"name":"complex"');
      expect(result).toContain('"description":"Complex command"');
      expect(result).toContain('"examples":["complex --option value"]');
      expect(result).toContain('"aliases":["cplx"]');
      expect(result).toContain('"additionalHelp":"Extra help text"');
    });
  });
});