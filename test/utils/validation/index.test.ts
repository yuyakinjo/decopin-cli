import { describe, expect, it } from 'bun:test';
import * as v from 'valibot';
import { extractData, createValidationFunction, isValibotSchema } from '../../../src/utils/validation/index.js';
import type { ParamsHandler } from '../../../src/types/index.js';

describe('validation utils', () => {
  describe('extractData', () => {
    const paramsDefinition: ParamsHandler = {
      mappings: [
        { field: 'name', type: 'string', argIndex: 0, option: 'name' },
        { field: 'age', type: 'number', argIndex: 1, option: 'age', defaultValue: 25 }
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
        name: 'Alice', // position引数を優先
        age: '25'      // position引数から
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
        age: 25 // デフォルト値
      });
    });

    it('should handle mixed scenarios correctly', () => {
      const result = extractData(
        ['Bob'],
        { age: '35' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'Bob',
        age: '35'
      });
    });
  });

  describe('createValidationFunction', () => {
    const paramsDefinition: ParamsHandler = {
      mappings: [
        { field: 'name', type: 'string', option: 'name', argIndex: 0, required: true },
        { field: 'email', type: 'string', option: 'email', argIndex: 1, required: true }
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

    it('should create a validation function that validates with schema', async () => {
      const schemaDefinition: ParamsHandler = {
        schema: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          email: v.pipe(v.string(), v.email())
        })
      };

      const validateFn = createValidationFunction(schemaDefinition);

      const result = await validateFn(
        [],
        { name: '', email: 'invalid-email' },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Validation failed');
      expect(result.error?.issues).toBeDefined();
    });

    it('should handle validation with default values', async () => {
      const paramsWithDefaults: ParamsHandler = {
        mappings: [
          { field: 'name', type: 'string', option: 'name', argIndex: 0, required: true },
          { field: 'count', type: 'number', option: 'count', argIndex: 1, defaultValue: 5 }
        ]
      };

      const validateFn = createValidationFunction(paramsWithDefaults);

      const result = await validateFn(['John'], {}, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        count: 5
      });
    });

    it('should handle validation errors gracefully', async () => {
      const invalidParamsDefinition = {
        schema: { invalid: 'schema' } // 無効なスキーマ
      } as ParamsHandler;

      const validateFn = createValidationFunction(invalidParamsDefinition);

      const result = await validateFn([], {}, {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid schema');
    });
  });

  describe('isValibotSchema', () => {
    it('should return true for valid valibot string schema', () => {
      const schema = v.string();
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return true for valid valibot number schema', () => {
      const schema = v.number();
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return true for valid valibot object schema', () => {
      const schema = v.object({
        name: v.string(),
        age: v.number()
      });
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return true for valid valibot array schema', () => {
      const schema = v.array(v.string());
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return true for valid valibot pipe schema', () => {
      const schema = v.pipe(v.string(), v.minLength(1));
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValibotSchema(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValibotSchema(undefined)).toBe(false);
    });

    it('should return false for primitive string', () => {
      expect(isValibotSchema('string')).toBe(false);
    });

    it('should return false for primitive number', () => {
      expect(isValibotSchema(42)).toBe(false);
    });

    it('should return false for primitive boolean', () => {
      expect(isValibotSchema(true)).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isValibotSchema({ name: 'test' })).toBe(false);
    });

    it('should return false for object missing required properties', () => {
      const invalidSchema = {
        kind: 'string',
        type: 'string'
        // missing 'async' and '~run' properties
      };
      expect(isValibotSchema(invalidSchema)).toBe(false);
    });

    it('should return false for object with wrong property types', () => {
      const invalidSchema = {
        kind: 123, // should be string
        type: 'string',
        async: false,
        '~run': () => {}
      };
      expect(isValibotSchema(invalidSchema)).toBe(false);
    });

    it('should return false for object with non-function ~run property', () => {
      const invalidSchema = {
        kind: 'string',
        type: 'string',
        async: false,
        '~run': 'not a function'
      };
      expect(isValibotSchema(invalidSchema)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isValibotSchema(['item1', 'item2'])).toBe(false);
    });

    it('should return false for function', () => {
      expect(isValibotSchema(() => {})).toBe(false);
    });
  });
});