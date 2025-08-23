import { describe, it, expect } from 'bun:test';
import {
  isValidationSuccess,
  isValidationFailure,
  hasValidationIssues,
  isValibotSchema,
  isManualSchema,
  hasRequiredSchemaProperties,
  isValidationIssue,
  isFieldDefinition,
  hasDefaultValue,
  hasEnumValues,
  hasMinValue,
  hasMaxValue,
} from '../../../src/utils/guards/validation.js';
import type { ValidationResult, ValidationError } from '../../../src/types/validation.js';

describe('Validation Result Guards', () => {
  describe('isValidationSuccess', () => {
    it('should return true for success results', () => {
      const success: ValidationResult<string> = {
        success: true,
        data: 'test',
      };
      expect(isValidationSuccess(success)).toBe(true);
    });

    it('should return false for failure results', () => {
      const failure: ValidationResult = {
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: ['field'], message: 'Required' }],
        },
      };
      expect(isValidationFailure(failure)).toBe(true);
      expect(isValidationSuccess(failure)).toBe(false);
    });
  });

  describe('isValidationFailure', () => {
    it('should return true for failure results', () => {
      const failure: ValidationResult = {
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: ['field'], message: 'Invalid type' }],
        },
      };
      expect(isValidationFailure(failure)).toBe(true);
    });

    it('should return false for success results', () => {
      const success: ValidationResult<number> = {
        success: true,
        data: 42,
      };
      expect(isValidationFailure(success)).toBe(false);
    });
  });

  describe('hasValidationIssues', () => {
    it('should return true for failures with issues', () => {
      const failure: ValidationResult = {
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: ['field'], message: 'Required' }],
        },
      };
      expect(hasValidationIssues(failure)).toBe(true);
    });

    it('should return false for empty issues', () => {
      const failure: ValidationResult = {
        success: false,
        error: {
          message: 'Validation failed',
          issues: [],
        },
      };
      expect(hasValidationIssues(failure)).toBe(false);
    });

    it('should return false for success results', () => {
      const success: ValidationResult<string> = {
        success: true,
        data: 'test',
      };
      expect(hasValidationIssues(success)).toBe(false);
    });
  });
});

describe('Schema Guards', () => {
  describe('isValibotSchema', () => {
    it('should return true for valibot schemas', () => {
      const schema = {
        _run: () => {},
        _types: { input: 'string', output: 'string' },
      };
      expect(isValibotSchema(schema)).toBe(true);
    });

    it('should return false for non-valibot schemas', () => {
      expect(isValibotSchema({})).toBe(false);
      expect(isValibotSchema({ run: () => {} })).toBe(false);
      expect(isValibotSchema({ _run: 'not a function' })).toBe(false);
      expect(isValibotSchema(null)).toBe(false);
    });
  });

  describe('isManualSchema', () => {
    it('should return true for manual schemas', () => {
      const schema = {
        type: 'manual' as const,
        validate: () => ({ success: true, data: 'test' }),
      };
      expect(isManualSchema(schema)).toBe(true);
    });

    it('should return false for non-manual schemas', () => {
      expect(isManualSchema({})).toBe(false);
      expect(isManualSchema({ type: 'auto' })).toBe(false);
      expect(isManualSchema({ type: 'manual' })).toBe(false);
      expect(isManualSchema({ type: 'manual', validate: 'not a function' })).toBe(false);
    });
  });

  describe('hasRequiredSchemaProperties', () => {
    it('should return true when all properties exist', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(hasRequiredSchemaProperties(obj, ['a', 'b'])).toBe(true);
      expect(hasRequiredSchemaProperties(obj, [])).toBe(true);
    });

    it('should return false when properties are missing', () => {
      const obj = { a: 1, b: 2 };
      expect(hasRequiredSchemaProperties(obj, ['a', 'b', 'c'])).toBe(false);
      expect(hasRequiredSchemaProperties(obj, ['x'])).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasRequiredSchemaProperties(null, ['a'])).toBe(false);
      expect(hasRequiredSchemaProperties('string', ['a'])).toBe(false);
    });
  });
});

describe('Issue Guards', () => {
  describe('isValidationIssue', () => {
    it('should return true for valid issues', () => {
      const issue = {
        kind: 'required',
        path: ['field'],
        message: 'Field is required',
      };
      expect(isValidationIssue(issue)).toBe(true);
    });

    it('should return false for invalid issues', () => {
      expect(isValidationIssue({})).toBe(false);
      expect(isValidationIssue({ kind: 'required' })).toBe(false);
      expect(isValidationIssue({ kind: 'required', message: 123 })).toBe(false);
      expect(isValidationIssue(null)).toBe(false);
    });
  });
});

describe('Field Definition Guards', () => {
  describe('isFieldDefinition', () => {
    it('should return true for field definitions', () => {
      expect(isFieldDefinition({ type: 'string' })).toBe(true);
      expect(isFieldDefinition({ type: 'number', defaultValue: 0 })).toBe(true);
    });

    it('should return false for invalid definitions', () => {
      expect(isFieldDefinition({})).toBe(false);
      expect(isFieldDefinition({ type: 123 })).toBe(false);
      expect(isFieldDefinition(null)).toBe(false);
    });
  });

  describe('hasDefaultValue', () => {
    it('should return true when default value exists', () => {
      expect(hasDefaultValue({ defaultValue: 0 })).toBe(true);
      expect(hasDefaultValue({ defaultValue: '' })).toBe(true);
      expect(hasDefaultValue({ defaultValue: false })).toBe(true);
      expect(hasDefaultValue({ defaultValue: null })).toBe(true);
    });

    it('should return false when default value is undefined', () => {
      expect(hasDefaultValue({ defaultValue: undefined })).toBe(false);
      expect(hasDefaultValue({})).toBe(false);
      expect(hasDefaultValue(null)).toBe(false);
    });
  });

  describe('hasEnumValues', () => {
    it('should return true for non-empty enum arrays', () => {
      expect(hasEnumValues({ enum: ['a', 'b', 'c'] })).toBe(true);
      expect(hasEnumValues({ enum: [1, 2, 3] })).toBe(true);
    });

    it('should return false for empty or invalid enums', () => {
      expect(hasEnumValues({ enum: [] })).toBe(false);
      expect(hasEnumValues({ enum: 'not an array' })).toBe(false);
      expect(hasEnumValues({})).toBe(false);
      expect(hasEnumValues(null)).toBe(false);
    });
  });

  describe('hasMinValue', () => {
    it('should return true for numeric min values', () => {
      expect(hasMinValue({ minValue: 0 })).toBe(true);
      expect(hasMinValue({ minValue: -100 })).toBe(true);
      expect(hasMinValue({ minValue: 3.14 })).toBe(true);
    });

    it('should return false for non-numeric min values', () => {
      expect(hasMinValue({ minValue: '0' })).toBe(false);
      expect(hasMinValue({})).toBe(false);
      expect(hasMinValue(null)).toBe(false);
    });
  });

  describe('hasMaxValue', () => {
    it('should return true for numeric max values', () => {
      expect(hasMaxValue({ maxValue: 100 })).toBe(true);
      expect(hasMaxValue({ maxValue: -10 })).toBe(true);
      expect(hasMaxValue({ maxValue: 3.14 })).toBe(true);
    });

    it('should return false for non-numeric max values', () => {
      expect(hasMaxValue({ maxValue: '100' })).toBe(false);
      expect(hasMaxValue({})).toBe(false);
      expect(hasMaxValue(null)).toBe(false);
    });
  });
});