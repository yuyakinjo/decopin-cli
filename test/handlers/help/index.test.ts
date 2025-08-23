import { describe, it, expect } from 'bun:test';
import { createHelpHandler, generateHelpText } from '../../../src/handlers/help/index.js';
import type { HelpDefinition } from '../../../src/handlers/help/types.js';

describe('Help Handler', () => {
  describe('createHelpHandler', () => {
    it('should create a help handler with valid definition', () => {
      const definition: HelpDefinition = {
        description: 'Test command',
        usage: 'test [options]',
        examples: ['test --name value']
      };

      const handler = createHelpHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.generate).toBe('function');
    });

    it('should generate help text', () => {
      const definition: HelpDefinition = {
        description: 'Test command',
        usage: 'test [options]',
        examples: ['test --name value']
      };

      const handler = createHelpHandler(definition);
      const helpText = handler.generate();

      expect(helpText).toContain('Test command');
      expect(helpText).toContain('test [options]');
      expect(helpText).toContain('test --name value');
    });
  });

  describe('generateHelpText', () => {
    it('should generate formatted help text', () => {
      const definition: HelpDefinition = {
        description: 'A test command that does something',
        usage: 'test [options] <input>',
        examples: [
          'test --verbose input.txt',
          'test --output result.txt input.txt'
        ],
        options: [
          { name: 'verbose', description: 'Enable verbose output', type: 'boolean' },
          { name: 'output', description: 'Output file path', type: 'string' }
        ]
      };

      const helpText = generateHelpText(definition);

      expect(helpText).toContain('A test command that does something');
      expect(helpText).toContain('Usage:');
      expect(helpText).toContain('test [options] <input>');
      expect(helpText).toContain('Examples:');
      expect(helpText).toContain('test --verbose input.txt');
      expect(helpText).toContain('Options:');
      expect(helpText).toContain('--verbose');
      expect(helpText).toContain('Enable verbose output');
    });

    it('should handle minimal help definition', () => {
      const definition: HelpDefinition = {
        description: 'Simple command'
      };

      const helpText = generateHelpText(definition);
      expect(helpText).toContain('Simple command');
    });
  });
});