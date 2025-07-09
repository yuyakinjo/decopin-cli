import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { extractData, createValidationFunction } from './validation.js';
import type { ParamsDefinition } from '../types/command.js';

describe('validation utils', () => {
  describe('extractData', () => {
    it('should extract data from options', () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.string(),
          age: v.number()
        }),
        mappings: [
          { field: 'name', option: 'name' },
          { field: 'age', option: 'age' }
        ]
      };

      const result = extractData(
        [],
        { name: 'John', age: 25 },
        {},
        paramsDefinition
      );

      expect(result).toEqual({ name: 'John', age: 25 });
    });

    it('should extract data from position arguments', () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.string(),
          email: v.string()
        }),
        mappings: [
          { field: 'name', argIndex: 0 },
          { field: 'email', argIndex: 1 }
        ]
      };

      const result = extractData(
        ['John', 'john@example.com'],
        {},
        {},
        paramsDefinition
      );

      expect(result).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should prefer options over position arguments', () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.string(),
          email: v.string()
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'email', option: 'email', argIndex: 1 }
        ]
      };

      const result = extractData(
        ['PositionName', 'position@example.com'],
        { name: 'OptionName' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'OptionName', // オプションが優先される
        email: 'position@example.com' // 位置引数が使用される
      });
    });

    it('should use default values when no option or argument provided', () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.string(),
          greeting: v.string()
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'greeting', option: 'greeting', defaultValue: 'Hello' }
        ]
      };

      const result = extractData(
        ['John'],
        {},
        {},
        paramsDefinition
      );

      expect(result).toEqual({ name: 'John', greeting: 'Hello' });
    });

    it('should handle mixed scenarios correctly', () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.string(),
          age: v.number(),
          city: v.string()
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'age', option: 'age', argIndex: 1 },
          { field: 'city', option: 'city', defaultValue: 'Tokyo' }
        ]
      };

      const result = extractData(
        ['John', 25],
        { city: 'Osaka' },
        {},
        paramsDefinition
      );

      expect(result).toEqual({
        name: 'John',
        age: 25,
        city: 'Osaka' // オプションでデフォルト値を上書き
      });
    });
  });

  describe('createValidationFunction', () => {
    it('should create a validation function that validates successfully', async () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          email: v.pipe(v.string(), v.email())
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'email', option: 'email', argIndex: 1 }
        ]
      };

      const validate = createValidationFunction(paramsDefinition);

      const result = await validate(
        ['John', 'john@example.com'],
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should create a validation function that fails validation', async () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          email: v.pipe(v.string(), v.email())
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'email', option: 'email', argIndex: 1 }
        ]
      };

      const validate = createValidationFunction(paramsDefinition);

      const result = await validate(
        ['', 'invalid-email'],
        {},
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Validation failed');
      expect(result.error?.issues).toBeDefined();
      expect(result.error?.issues?.length).toBeGreaterThan(0);
    });

    it('should handle validation with default values', async () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          greeting: v.string()
        }),
        mappings: [
          { field: 'name', option: 'name', argIndex: 0 },
          { field: 'greeting', option: 'greeting', defaultValue: 'Hello' }
        ]
      };

      const validate = createValidationFunction(paramsDefinition);

      const result = await validate(
        ['World'],
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'World', greeting: 'Hello' });
    });

    it('should handle validation errors gracefully', async () => {
      const paramsDefinition: ParamsDefinition = {
        schema: v.object({
          count: v.number()
        }),
        mappings: [
          { field: 'count', option: 'count', argIndex: 0 }
        ]
      };

      const validate = createValidationFunction(paramsDefinition);

      const result = await validate(
        ['not-a-number'],
        {},
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Validation failed');
    });
  });
});