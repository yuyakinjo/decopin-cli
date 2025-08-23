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

export * from './ast.js';
export * from './validation.js';
