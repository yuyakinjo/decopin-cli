import { describe, it, expect } from 'vitest';
import {
  isFlag,
  isLongFlag,
  isShortFlag,
  isDynamicSegment,
  isOptionalParam,
  isVariadicParam,
  isTypeScriptFile,
  isCommandFile,
  isHelpFile,
  isParamsFile,
  isEnvFile,
  isSpecialFile,
  extractDynamicSegmentName,
  extractFlagName,
  isEmptyString,
  isNonEmptyString,
} from '../../../src/internal/guards/string';

describe('Flag Guards', () => {
  describe('isFlag', () => {
    it('should return true for flags', () => {
      expect(isFlag('-v')).toBe(true);
      expect(isFlag('--version')).toBe(true);
      expect(isFlag('-abc')).toBe(true);
      expect(isFlag('--long-flag')).toBe(true);
    });

    it('should return false for non-flags', () => {
      expect(isFlag('version')).toBe(false);
      expect(isFlag('v')).toBe(false);
      expect(isFlag('')).toBe(false);
      expect(isFlag('a-b')).toBe(false);
    });
  });

  describe('isLongFlag', () => {
    it('should return true for long flags', () => {
      expect(isLongFlag('--version')).toBe(true);
      expect(isLongFlag('--help')).toBe(true);
      expect(isLongFlag('--output-file')).toBe(true);
    });

    it('should return false for short flags and non-flags', () => {
      expect(isLongFlag('-v')).toBe(false);
      expect(isLongFlag('-version')).toBe(false);
      expect(isLongFlag('version')).toBe(false);
      expect(isLongFlag('')).toBe(false);
    });
  });

  describe('isShortFlag', () => {
    it('should return true for short flags', () => {
      expect(isShortFlag('-v')).toBe(true);
      expect(isShortFlag('-h')).toBe(true);
      expect(isShortFlag('-abc')).toBe(true);
    });

    it('should return false for long flags and non-flags', () => {
      expect(isShortFlag('--version')).toBe(false);
      expect(isShortFlag('v')).toBe(false);
      expect(isShortFlag('')).toBe(false);
    });
  });
});

describe('Dynamic Segment Guards', () => {
  describe('isDynamicSegment', () => {
    it('should return true for dynamic segments', () => {
      expect(isDynamicSegment('[id]')).toBe(true);
      expect(isDynamicSegment('[userId]')).toBe(true);
      expect(isDynamicSegment('[...params]')).toBe(true);
    });

    it('should return false for non-dynamic segments', () => {
      expect(isDynamicSegment('id')).toBe(false);
      expect(isDynamicSegment('[id')).toBe(false);
      expect(isDynamicSegment('id]')).toBe(false);
      expect(isDynamicSegment('')).toBe(false);
    });
  });

  describe('isOptionalParam', () => {
    it('should return true for optional params', () => {
      expect(isOptionalParam('[...args]')).toBe(true);
      expect(isOptionalParam('[...params]')).toBe(true);
    });

    it('should return false for regular params', () => {
      expect(isOptionalParam('[id]')).toBe(false);
      expect(isOptionalParam('...args')).toBe(false);
      expect(isOptionalParam('')).toBe(false);
    });
  });

  describe('isVariadicParam', () => {
    it('should return true for variadic params', () => {
      expect(isVariadicParam('[...args]')).toBe(true);
      expect(isVariadicParam('...rest')).toBe(true);
      expect(isVariadicParam('prefix...suffix')).toBe(true);
    });

    it('should return false for non-variadic params', () => {
      expect(isVariadicParam('[id]')).toBe(false);
      expect(isVariadicParam('args')).toBe(false);
      expect(isVariadicParam('')).toBe(false);
    });
  });

  describe('extractDynamicSegmentName', () => {
    it('should extract name from dynamic segments', () => {
      expect(extractDynamicSegmentName('[id]')).toBe('id');
      expect(extractDynamicSegmentName('[userId]')).toBe('userId');
      expect(extractDynamicSegmentName('[...params]')).toBe('...params');
    });

    it('should return null for non-dynamic segments', () => {
      expect(extractDynamicSegmentName('id')).toBe(null);
      expect(extractDynamicSegmentName('[id')).toBe(null);
      expect(extractDynamicSegmentName('')).toBe(null);
    });
  });
});

describe('File Guards', () => {
  describe('isTypeScriptFile', () => {
    it('should return true for TypeScript files', () => {
      expect(isTypeScriptFile('file.ts')).toBe(true);
      expect(isTypeScriptFile('component.tsx')).toBe(true);
      expect(isTypeScriptFile('/path/to/file.ts')).toBe(true);
    });

    it('should return false for non-TypeScript files', () => {
      expect(isTypeScriptFile('file.js')).toBe(false);
      expect(isTypeScriptFile('file.txt')).toBe(false);
      expect(isTypeScriptFile('file')).toBe(false);
      expect(isTypeScriptFile('')).toBe(false);
    });
  });

  describe('isCommandFile', () => {
    it('should return true for command.ts', () => {
      expect(isCommandFile('command.ts')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(isCommandFile('commands.ts')).toBe(false);
      expect(isCommandFile('command.js')).toBe(false);
      expect(isCommandFile('help.ts')).toBe(false);
    });
  });

  describe('isHelpFile', () => {
    it('should return true for help.ts', () => {
      expect(isHelpFile('help.ts')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(isHelpFile('helps.ts')).toBe(false);
      expect(isHelpFile('help.js')).toBe(false);
      expect(isHelpFile('command.ts')).toBe(false);
    });
  });

  describe('isParamsFile', () => {
    it('should return true for params.ts', () => {
      expect(isParamsFile('params.ts')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(isParamsFile('param.ts')).toBe(false);
      expect(isParamsFile('params.js')).toBe(false);
      expect(isParamsFile('command.ts')).toBe(false);
    });
  });

  describe('isEnvFile', () => {
    it('should return true for env.ts', () => {
      expect(isEnvFile('env.ts')).toBe(true);
    });

    it('should return false for other files', () => {
      expect(isEnvFile('envs.ts')).toBe(false);
      expect(isEnvFile('env.js')).toBe(false);
      expect(isEnvFile('.env')).toBe(false);
    });
  });

  describe('isSpecialFile', () => {
    it('should correctly identify special files', () => {
      expect(isSpecialFile('command.ts', 'command')).toBe(true);
      expect(isSpecialFile('help.ts', 'help')).toBe(true);
      expect(isSpecialFile('params.ts', 'params')).toBe(true);
      expect(isSpecialFile('env.ts', 'env')).toBe(true);
    });

    it('should return false for mismatched types', () => {
      expect(isSpecialFile('command.ts', 'help')).toBe(false);
      expect(isSpecialFile('help.ts', 'command')).toBe(false);
      expect(isSpecialFile('other.ts', 'command')).toBe(false);
    });
  });
});

describe('Flag Extraction', () => {
  describe('extractFlagName', () => {
    it('should extract name from long flags', () => {
      expect(extractFlagName('--version')).toBe('version');
      expect(extractFlagName('--output-file')).toBe('output-file');
    });

    it('should extract name from short flags', () => {
      expect(extractFlagName('-v')).toBe('v');
      expect(extractFlagName('-h')).toBe('h');
    });

    it('should return original for non-flags', () => {
      expect(extractFlagName('version')).toBe('version');
      expect(extractFlagName('')).toBe('');
    });
  });
});

describe('String Content Guards', () => {
  describe('isEmptyString', () => {
    it('should return true for empty strings', () => {
      expect(isEmptyString('')).toBe(true);
      expect(isEmptyString(' ')).toBe(true);
      expect(isEmptyString('\t')).toBe(true);
      expect(isEmptyString('\n')).toBe(true);
      expect(isEmptyString('  \t\n  ')).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(isEmptyString('a')).toBe(false);
      expect(isEmptyString(' a ')).toBe(false);
      expect(isEmptyString('hello')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString(' a ')).toBe(true);
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(' ')).toBe(false);
      expect(isNonEmptyString('\t')).toBe(false);
      expect(isNonEmptyString('\n')).toBe(false);
    });
  });
});