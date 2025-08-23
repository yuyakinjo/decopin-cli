import { describe, it, expect } from 'bun:test';
import {
  createValidationFunction,
  isManualSchema,
  isValibotSchema
} from '../../src/utils/validation/index.js';
import type { ParamsHandler, ManualSchema } from '../../src/types/index.js';
import * as v from 'valibot';

describe('Manual Schema Validation', () => {
  describe('isManualSchema', () => {
    it('should correctly identify manual schemas', () => {
      const manualSchema: ManualSchema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
      };

      expect(isManualSchema(manualSchema)).toBe(true);
    });

    it('should return false for valibot schemas', () => {
      const valibotSchema = v.object({
        name: v.string(),
        age: v.number(),
      });

      expect(isManualSchema(valibotSchema)).toBe(false);
    });

    it('should return false for invalid objects', () => {
      expect(isManualSchema(null)).toBe(false);
      expect(isManualSchema(undefined)).toBe(false);
      expect(isManualSchema({})).toBe(true); // 空のオブジェクトは有効
      expect(isManualSchema({ invalid: 'field' })).toBe(false);
    });
  });

  describe('isValibotSchema', () => {
    it('should correctly identify valibot schemas', () => {
      const valibotSchema = v.object({
        name: v.string(),
        age: v.number(),
      });

      expect(isValibotSchema(valibotSchema)).toBe(true);
    });

    it('should return false for manual schemas', () => {
      const manualSchema: ManualSchema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
      };

      expect(isValibotSchema(manualSchema)).toBe(false);
    });
  });

  describe('Manual Schema Validation', () => {
    const createManualParamsDefinition = (): ParamsHandler => ({
      schema: {
        name: {
          type: 'string',
          required: true,
          minLength: 2,
          maxLength: 50,
        },
        age: {
          type: 'number',
          required: false,
          minValue: 0,
          maxValue: 150,
          defaultValue: 25,
        },
        active: {
          type: 'boolean',
          required: false,
          defaultValue: true,
        },
        role: {
          type: 'string',
          required: false,
          enum: ['admin', 'user', 'guest'],
          defaultValue: 'user',
        },
      },
      mappings: [
        { field: 'name', argIndex: 0, option: 'name' },
        { field: 'age', argIndex: 1, option: 'age' },
        { field: 'active', option: 'active' },
        { field: 'role', option: 'role' },
      ],
    });

    it('should validate data with manual schema successfully', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(
        ['John', '30'],
        { active: 'true', role: 'admin' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        age: 30,
        active: true,
        role: 'admin',
      });
    });

    it('should apply default values correctly', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(['Alice'], {}, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'Alice',
        age: 25,
        active: true,
        role: 'user',
      });
    });

    it('should validate required fields', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction([], {}, {});

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].path).toEqual([{ key: 'name' }]);
      expect(result.error?.issues?.[0].message).toBe('name is required');
    });

    it('should validate string length constraints', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(['A'], {}, {});

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe('name must be at least 2 characters');
    });

    it('should validate number range constraints', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(['John'], { age: '200' }, {});

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe('age cannot exceed 150');
    });

    it('should validate enum constraints', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(['John'], { role: 'invalid' }, {});

      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues?.[0].message).toBe('role must be one of: admin, user, guest');
    });

    it('should handle boolean conversion correctly', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

            const result1 = await validateFunction(['John'], { active: 'true' }, {});
      expect(result1.success).toBe(true);
      expect(result1.data && 'active' in result1.data && result1.data.active).toBe(true);

      const result2 = await validateFunction(['John'], { active: 'false' }, {});
      expect(result2.success).toBe(true);
      expect(result2.data && 'active' in result2.data && result2.data.active).toBe(false);

      const result3 = await validateFunction(['John'], { active: '1' }, {});
      expect(result3.success).toBe(true);
      expect(result3.data && 'active' in result3.data && result3.data.active).toBe(true);
    });

    it('should prioritize positional arguments over options', async () => {
      const paramsDefinition = createManualParamsDefinition();
      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(
        ['PositionalName', '99'],
        { name: 'OptionName', age: '50' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'PositionalName',
        age: 99,
        active: true,
        role: 'user',
      });
    });
  });

  describe('Backward Compatibility with Valibot', () => {
    it('should still work with valibot schemas', async () => {
      const valibotSchema = v.object({
        name: v.string(),
        age: v.pipe(
          v.union([v.string(), v.number()]),
          v.transform((val) => Number(val)),
          v.number(),
          v.minValue(0)
        ),
      });

      const paramsDefinition: ParamsHandler = {
        schema: valibotSchema,
        mappings: [
          { field: 'name', argIndex: 0, option: 'name' },
          { field: 'age', argIndex: 1, option: 'age' },
        ],
      };

      const validateFunction = createValidationFunction(paramsDefinition);

      const result = await validateFunction(['John', '30'], {}, {});

      // デバッグ用：エラーの詳細を確認
      if (!result.success) {
        console.log('Validation failed:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        age: 30,
      });
    });
  });
});