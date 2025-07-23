import { describe, it, expect } from 'vitest';
import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isFunction,
  isError,
  isArray,
  isDefined,
  isNotNull,
  isNotNullish,
  hasValue,
  isValidNumber,
  isInRange,
  isPositive,
  isInteger,
  isNonEmptyArray,
  isStringArray,
  isInEnum,
  hasProperty,
  getErrorMessage,
  isErrorWithCode,
} from '../../../src/internal/guards';

describe('Basic Type Guards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString('123')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(12.34)).toBe(true);
      expect(isNumber(NaN)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('should return false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(Object.create(null))).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('object')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(new Date())).toBe(true);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(Date)).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction('function')).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error())).toBe(true);
      expect(isError(new TypeError())).toBe(true);
      expect(isError(new RangeError())).toBe(true);
    });

    it('should return false for non-errors', () => {
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError('error')).toBe(false);
      expect(isError(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array())).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray({ length: 0 })).toBe(false);
    });
  });
});

describe('Null/Undefined Guards', () => {
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(null)).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isNotNull', () => {
    it('should return true for non-null values', () => {
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull('')).toBe(true);
      expect(isNotNull(false)).toBe(true);
      expect(isNotNull(undefined)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNotNull(null)).toBe(false);
    });
  });

  describe('isNotNullish', () => {
    it('should return true for non-nullish values', () => {
      expect(isNotNullish(0)).toBe(true);
      expect(isNotNullish('')).toBe(true);
      expect(isNotNullish(false)).toBe(true);
    });

    it('should return false for null and undefined', () => {
      expect(isNotNullish(null)).toBe(false);
      expect(isNotNullish(undefined)).toBe(false);
    });
  });

  describe('hasValue', () => {
    it('should return true for values', () => {
      expect(hasValue(0)).toBe(true);
      expect(hasValue('')).toBe(true);
      expect(hasValue(false)).toBe(true);
    });

    it('should return false for null and undefined', () => {
      expect(hasValue(null)).toBe(false);
      expect(hasValue(undefined)).toBe(false);
    });
  });
});

describe('Number Guards', () => {
  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(-123)).toBe(true);
      expect(isValidNumber(12.34)).toBe(true);
    });

    it('should return false for NaN and non-numbers', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber('123')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should check if number is in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('should return false for out of range', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });

    it('should handle undefined min/max', () => {
      expect(isInRange(5, undefined, 10)).toBe(true);
      expect(isInRange(5, 1, undefined)).toBe(true);
      expect(isInRange(5, undefined, undefined)).toBe(true);
    });
  });

  describe('isPositive', () => {
    it('should return true for positive numbers', () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive(0.1)).toBe(true);
      expect(isPositive(100)).toBe(true);
    });

    it('should return false for zero and negative', () => {
      expect(isPositive(0)).toBe(false);
      expect(isPositive(-1)).toBe(false);
      expect(isPositive(-0.1)).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should return true for integers', () => {
      expect(isInteger(0)).toBe(true);
      expect(isInteger(123)).toBe(true);
      expect(isInteger(-123)).toBe(true);
    });

    it('should return false for non-integers', () => {
      expect(isInteger(12.34)).toBe(false);
      expect(isInteger(0.1)).toBe(false);
      expect(isInteger(NaN)).toBe(false);
    });
  });
});

describe('Collection Guards', () => {
  describe('isNonEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray(['a', 'b'])).toBe(true);
    });

    it('should return false for empty arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });
  });

  describe('isStringArray', () => {
    it('should return true for string arrays', () => {
      expect(isStringArray([])).toBe(true);
      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
    });

    it('should return false for mixed arrays', () => {
      expect(isStringArray(['a', 1, 'c'])).toBe(false);
      expect(isStringArray([1, 2, 3])).toBe(false);
    });
  });

  describe('isInEnum', () => {
    const colors = ['red', 'green', 'blue'] as const;

    it('should return true for enum values', () => {
      expect(isInEnum('red', colors)).toBe(true);
      expect(isInEnum('green', colors)).toBe(true);
      expect(isInEnum('blue', colors)).toBe(true);
    });

    it('should return false for non-enum values', () => {
      expect(isInEnum('yellow', colors)).toBe(false);
      expect(isInEnum('', colors)).toBe(false);
      expect(isInEnum(null, colors)).toBe(false);
    });
  });
});

describe('Object Guards', () => {
  describe('hasProperty', () => {
    it('should return true when property exists', () => {
      expect(hasProperty({ a: 1 }, 'a')).toBe(true);
      expect(hasProperty({ name: 'test' }, 'name')).toBe(true);
    });

    it('should return false when property does not exist', () => {
      expect(hasProperty({}, 'a')).toBe(false);
      expect(hasProperty({ b: 1 }, 'a')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasProperty(null, 'a')).toBe(false);
      expect(hasProperty('string', 'a')).toBe(false);
    });
  });
});

describe('Error Guards', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instances', () => {
      expect(getErrorMessage(new Error('test error'))).toBe('test error');
      expect(getErrorMessage(new TypeError('type error'))).toBe('type error');
    });

    it('should convert non-errors to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('isErrorWithCode', () => {
    it('should return true for errors with code', () => {
      const error = Object.assign(new Error('test'), { code: 'TEST_ERROR' });
      expect(isErrorWithCode(error)).toBe(true);
    });

    it('should return false for errors without code', () => {
      expect(isErrorWithCode(new Error('test'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isErrorWithCode({ code: 'TEST' })).toBe(false);
      expect(isErrorWithCode('error')).toBe(false);
    });

    it('should return false for errors with non-string code', () => {
      const error = Object.assign(new Error('test'), { code: 123 });
      expect(isErrorWithCode(error)).toBe(false);
    });
  });
});