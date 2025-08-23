import { describe, expect, it } from 'bun:test';
import {
  createParameterHandler,
  extractParameterData,
  validateParameters,
} from '../../../src/handlers/params/index.js';
import type { ParamsHandler } from '../../../src/handlers/params/types.js';

describe('Parameter Handler', () => {
  describe('createParameterHandler', () => {
    it('should create a parameter handler with mappings', () => {
      const paramsDefinition: ParamsHandler = {
        mappings: [
          {
            field: 'name',
            argIndex: 0,
            type: 'string',
            required: true,
          },
        ],
      };

      const handler = createParameterHandler(paramsDefinition);
      expect(handler).toBeDefined();
      expect(handler.getSchemaType()).toBe('mappings-only');
    });

    it('should create a parameter handler with manual schema', () => {
      const paramsDefinition: ParamsHandler = {
        schema: {
          name: {
            type: 'string',
            required: true,
          },
        },
      };

      const handler = createParameterHandler(paramsDefinition);
      expect(handler).toBeDefined();
      expect(handler.getSchemaType()).toBe('manual');
    });
  });

  describe('extractParameterData', () => {
    it('should extract data from arguments using mappings', () => {
      const paramsDefinition: ParamsHandler = {
        mappings: [
          {
            field: 'name',
            argIndex: 0,
            type: 'string',
          },
          {
            field: 'age',
            option: 'age',
            type: 'number',
          },
        ],
      };

      const data = extractParameterData(
        ['John'],
        { age: '25' },
        {},
        paramsDefinition
      );

      expect(data).toEqual({
        name: 'John',
        age: '25',
      });
    });

    it('should use default values when arguments are missing', () => {
      const paramsDefinition: ParamsHandler = {
        mappings: [
          {
            field: 'name',
            argIndex: 0,
            type: 'string',
            defaultValue: 'Anonymous',
          },
        ],
      };

      const data = extractParameterData([], {}, {}, paramsDefinition);

      expect(data).toEqual({
        name: 'Anonymous',
      });
    });
  });

  describe('validateParameters', () => {
    it('should validate parameters with manual schema', async () => {
      const paramsDefinition: ParamsHandler = {
        schema: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: false,
            defaultValue: 18,
          },
        },
      };

      const result = await validateParameters(
        [],
        { name: 'John', age: '25' },
        {},
        paramsDefinition
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John',
        age: 25,
      });
    });

    it('should return validation error for missing required field', async () => {
      const paramsDefinition: ParamsHandler = {
        schema: {
          name: {
            type: 'string',
            required: true,
          },
        },
      };

      const result = await validateParameters([], {}, {}, paramsDefinition);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues[0].message).toContain('name is required');
    });
  });
});