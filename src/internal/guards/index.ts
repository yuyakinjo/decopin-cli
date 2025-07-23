/**
 * Type guard to check if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 * @example
 * ```ts
 * if (isString(value)) {
 *   // value is typed as string here
 *   console.log(value.toUpperCase());
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 * @param value - The value to check
 * @returns True if the value is a number (including NaN and Infinity), false otherwise
 * @example
 * ```ts
 * if (isNumber(value)) {
 *   // value is typed as number here
 *   console.log(value + 1);
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Type guard to check if a value is a boolean
 * @param value - The value to check
 * @returns True if the value is a boolean, false otherwise
 * @example
 * ```ts
 * if (isBoolean(value)) {
 *   // value is typed as boolean here
 *   console.log(value ? 'yes' : 'no');
 * }
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is a plain object (not null, array, or other object types)
 * @param value - The value to check
 * @returns True if the value is a plain object, false otherwise
 * @example
 * ```ts
 * if (isObject(value)) {
 *   // value is typed as Record<string, unknown> here
 *   console.log(Object.keys(value));
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a function
 * @param value - The value to check
 * @returns True if the value is a function, false otherwise
 * @example
 * ```ts
 * if (isFunction(value)) {
 *   // value is typed as Function here
 *   value();
 * }
 * ```
 */
export function isFunction(
  value: unknown
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is an Error instance
 * @param value - The value to check
 * @returns True if the value is an Error instance, false otherwise
 * @example
 * ```ts
 * if (isError(value)) {
 *   // value is typed as Error here
 *   console.log(value.message);
 * }
 * ```
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is an array
 * @param value - The value to check
 * @returns True if the value is an array, false otherwise
 * @example
 * ```ts
 * if (isArray(value)) {
 *   // value is typed as unknown[] here
 *   console.log(value.length);
 * }
 * ```
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is defined (not undefined)
 * @param value - The value to check
 * @returns True if the value is defined, false if undefined
 * @example
 * ```ts
 * const value: string | undefined = getValue();
 * if (isDefined(value)) {
 *   // value is typed as string here
 *   console.log(value.length);
 * }
 * ```
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Type guard to check if a value is not null
 * @param value - The value to check
 * @returns True if the value is not null, false if null
 * @example
 * ```ts
 * const value: string | null = getValue();
 * if (isNotNull(value)) {
 *   // value is typed as string here
 *   console.log(value.length);
 * }
 * ```
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Type guard to check if a value is not null or undefined
 * @param value - The value to check
 * @returns True if the value is neither null nor undefined
 * @example
 * ```ts
 * const value: string | null | undefined = getValue();
 * if (isNotNullish(value)) {
 *   // value is typed as string here
 *   console.log(value.length);
 * }
 * ```
 */
export function isNotNullish<T>(
  value: T | null | undefined
): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value has a value (not null or undefined)
 * Alias for isNotNullish for better readability in certain contexts
 * @param value - The value to check
 * @returns True if the value has a value (not null or undefined)
 * @example
 * ```ts
 * if (hasValue(config.apiKey)) {
 *   // config.apiKey is guaranteed to be defined here
 *   useApiKey(config.apiKey);
 * }
 * ```
 */
export function hasValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is a valid number (not NaN)
 * @param value - The value to check
 * @returns True if the value is a number and not NaN
 * @example
 * ```ts
 * if (isValidNumber(value)) {
 *   // value is a number and not NaN
 *   console.log(value * 2);
 * }
 * ```
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Checks if a number is within a specified range (inclusive)
 * @param value - The number to check
 * @param min - Minimum value (inclusive), optional
 * @param max - Maximum value (inclusive), optional
 * @returns True if the number is within the range
 * @example
 * ```ts
 * if (isInRange(age, 18, 65)) {
 *   console.log('Eligible for the program');
 * }
 * ```
 */
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Checks if a number is positive (greater than 0)
 * @param value - The number to check
 * @returns True if the number is positive
 * @example
 * ```ts
 * if (isPositive(balance)) {
 *   console.log('Account has funds');
 * }
 * ```
 */
export function isPositive(value: number): boolean {
  return value > 0;
}

/**
 * Checks if a number is an integer
 * @param value - The number to check
 * @returns True if the number is an integer
 * @example
 * ```ts
 * if (isInteger(count)) {
 *   console.log('Count is a whole number');
 * }
 * ```
 */
export function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Checks if an array is not empty
 * @param value - The array to check
 * @returns True if the array has at least one element
 * @example
 * ```ts
 * if (isNonEmptyArray(items)) {
 *   console.log(`First item: ${items[0]}`);
 * }
 * ```
 */
export function isNonEmptyArray<T>(value: T[]): boolean {
  return value.length > 0;
}

/**
 * Type guard to check if all elements in an array are strings
 * @param value - The array to check
 * @returns True if all elements are strings
 * @example
 * ```ts
 * const items = ['a', 'b', 'c'];
 * if (isStringArray(items)) {
 *   // items is typed as string[] here
 *   items.forEach(s => console.log(s.toUpperCase()));
 * }
 * ```
 */
export function isStringArray(value: unknown[]): value is string[] {
  return value.every((item): item is string => typeof item === 'string');
}

/**
 * Type guard to check if a value is included in a readonly array of values
 * @param value - The value to check
 * @param enumValues - The array of valid values
 * @returns True if the value is in the array
 * @example
 * ```ts
 * const colors = ['red', 'green', 'blue'] as const;
 * if (isInEnum(value, colors)) {
 *   // value is typed as 'red' | 'green' | 'blue'
 *   setColor(value);
 * }
 * ```
 */
export function isInEnum<T>(
  value: unknown,
  enumValues: readonly T[]
): value is T {
  return enumValues.includes(value as T);
}

/**
 * Type guard to check if an object has a specific property
 * @param obj - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property
 * @example
 * ```ts
 * if (hasProperty(obj, 'name')) {
 *   // obj is typed as { name: unknown, ... }
 *   console.log(obj.name);
 * }
 * ```
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Safely extracts an error message from an unknown value
 * @param error - The error value (can be anything)
 * @returns The error message if it's an Error, or the stringified value
 * @example
 * ```ts
 * try {
 *   // some operation
 * } catch (error) {
 *   console.error(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Type guard to check if an error has a code property
 * @param error - The error to check
 * @returns True if the error has a string code property
 * @example
 * ```ts
 * if (isErrorWithCode(error)) {
 *   // error is typed as Error & { code: string }
 *   if (error.code === 'ENOENT') {
 *     console.log('File not found');
 *   }
 * }
 * ```
 */
export function isErrorWithCode(
  error: unknown
): error is Error & { code: string } {
  return isError(error) && hasProperty(error, 'code') && isString(error.code);
}

export * from './ast.js';
export * from './string.js';
export * from './validation.js';
