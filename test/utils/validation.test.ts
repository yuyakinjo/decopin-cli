import { describe, expect, it } from 'vitest';
import { extractData, createValidationFunction } from '../../src/utils/validation.js';
import type { ParamsDefinition } from '../../src/types/validation.js';
import * as v from 'valibot';

describe('validation utils', () => {
  describe('extractData', () => {
    const paramsDefinition: ParamsDefinition = {
      schemaType: 'valibot',
      schema: v.object({
        name: v.string(),
        age: v.string()
      }),
      mappings: [
        { field: 'name', option: 'name', argIndex: 0 },
        { field: 'age', option: 'age', argIndex: 1, defaultValue: '25' }
      ]
    };

    it('should extract data from options', () => {
      const result = extractData(
        [],
        { name: 'John', age: '30' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'John',
        age: '30'
      });
    });

    it('should extract data from position arguments', () => {
      const result = extractData(
        ['Alice', '25'],
        {},
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'Alice',
        age: '25'
      });
    });

    it('should prefer options over position arguments', () => {
      const result = extractData(
        ['Alice', '25'],
        { name: 'John' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'John', // optionを優先
        age: '25'     // position引数から
      });
    });

    it('should use default values when no option or argument provided', () => {
      const result = extractData(
        ['John'],
        {},
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'John',
        age: '25' // デフォルト値
      });
    });

    it('should handle mixed scenarios correctly', () => {
      const result = extractData(
        ['Alice'],
        { age: '30' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'Alice', // position引数から
        age: '30'      // optionから
      });
    });
  });

  describe('createValidationFunction', () => {
    const paramsDefinition: ParamsDefinition = {
      schemaType: 'valibot',
      schema: v.object({
        name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
        email: v.pipe(v.string(), v.email('Invalid email format'))
      }),
      mappings: [
        { field: 'name', option: 'name', argIndex: 0 },
        { field: 'email', option: 'email', argIndex: 1 }
      ]
    };

    it('should create a validation function that validates successfully', async () => {
      const validateFn = createValidationFunction(paramsDefinition);

      const result = await validateFn(
        ['John', 'john@example.com'],
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should create a validation function that fails validation', async () => {
      const validateFn = createValidationFunction(paramsDefinition);

      const result = await validateFn(
        ['', 'invalid-email'],
        {},
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(2);
    });

    it('should handle validation with default values', async () => {
      const paramsWithDefaults: ParamsDefinition = {
        schemaType: 'valibot',
        schema: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          greeting: v.string()
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'greeting', option: 'greeting', argIndex: 1, defaultValue: 'Hello' }
        ]
      };

      const validateFn = createValidationFunction(paramsWithDefaults);

      const result = await validateFn(
        ['John'],
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        greeting: 'Hello'
      });
    });

    it('should handle validation errors gracefully', async () => {
      const validateFn = createValidationFunction(paramsDefinition);

      const result = await validateFn(
        ['John', 'not-an-email'],
        {},
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Validation failed');
      expect(result.error?.issues?.[0]?.message).toContain('Invalid email format');
    });
  });
});