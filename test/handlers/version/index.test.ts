import { describe, it, expect } from 'bun:test';
import { createVersionHandler, formatVersion } from '../../../src/handlers/version/index.js';
import type { VersionDefinition } from '../../../src/handlers/version/types.js';

describe('Version Handler', () => {
  describe('createVersionHandler', () => {
    it('should create a version handler', () => {
      const definition: VersionDefinition = {
        version: '1.0.0',
        name: 'test-cli'
      };

      const handler = createVersionHandler(definition);
      expect(handler).toBeDefined();
      expect(typeof handler.getVersion).toBe('function');
    });

    it('should return formatted version string', () => {
      const definition: VersionDefinition = {
        version: '2.1.0',
        name: 'my-cli',
        description: 'A test CLI tool'
      };

      const handler = createVersionHandler(definition);
      const versionString = handler.getVersion();

      expect(versionString).toContain('my-cli');
      expect(versionString).toContain('2.1.0');
      expect(versionString).toContain('A test CLI tool');
    });
  });

  describe('formatVersion', () => {
    it('should format version with name only', () => {
      const definition: VersionDefinition = {
        version: '1.0.0',
        name: 'simple-cli'
      };

      const formatted = formatVersion(definition);
      expect(formatted).toContain('simple-cli');
      expect(formatted).toContain('1.0.0');
    });

    it('should format version with description', () => {
      const definition: VersionDefinition = {
        version: '1.2.3',
        name: 'advanced-cli',
        description: 'An advanced command line tool'
      };

      const formatted = formatVersion(definition);
      expect(formatted).toContain('advanced-cli');
      expect(formatted).toContain('1.2.3');
      expect(formatted).toContain('An advanced command line tool');
    });

    it('should format version with build info', () => {
      const definition: VersionDefinition = {
        version: '1.0.0',
        name: 'build-cli',
        buildInfo: {
          commit: 'abc123',
          date: '2024-01-01',
          branch: 'main'
        }
      };

      const formatted = formatVersion(definition);
      expect(formatted).toContain('build-cli');
      expect(formatted).toContain('1.0.0');
      expect(formatted).toContain('abc123');
      expect(formatted).toContain('2024-01-01');
    });
  });
});