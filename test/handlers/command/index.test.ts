import { describe, it, expect } from 'bun:test';
import { createCommandHandler, parseCommandDefinitions } from '../../../src/handlers/command/index.js';
import type { CommandDefinition } from '../../../src/handlers/command/types.js';

describe('Command Handler', () => {
  describe('createCommandHandler', () => {
    it('should create a command handler with valid definition', () => {
      const definition: CommandDefinition = {
        name: 'test',
        path: '/test/path',
        handler: async () => {},
        metadata: {
          description: 'Test command'
        }
      };

      const handler = createCommandHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.execute).toBe('function');
    });

    it('should handle command execution', async () => {
      let executed = false;
      const definition: CommandDefinition = {
        name: 'test',
        path: '/test/path',
        handler: async () => {
          executed = true;
        }
      };

      const handler = createCommandHandler(definition);
      await handler.execute({}, [], {});
      expect(executed).toBe(true);
    });
  });

  describe('parseCommandDefinitions', () => {
    it('should parse command definitions from files', async () => {
      const mockFiles = [
        {
          path: '/test/command.ts',
          commandPath: 'test'
        }
      ];

      // This would normally parse actual files, but for testing we'll mock the behavior
      const definitions = await parseCommandDefinitions(mockFiles);
      expect(Array.isArray(definitions)).toBe(true);
    });
  });
});