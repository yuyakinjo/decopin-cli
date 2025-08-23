import type {
  ValidationError,
  ValidationResult,
} from '../../types/validation.js';
import { hasProperty, isObject } from './index.js';

/**
 * Type guard to check if a validation result is successful
 * @param result - The validation result to check
 * @returns True if the result is successful
 * @example
 * ```ts
 * const result = validate(data);
 * if (isValidationSuccess(result)) {
 *   // result.data is typed and available
 *   console.log('Valid data:', result.data);
 * }
 * ```
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a validation result is a failure
 * @param result - The validation result to check
 * @returns True if the result is a failure
 * @example
 * ```ts
 * const result = validate(data);
 * if (isValidationFailure(result)) {
 *   // result.error is available
 *   console.error('Validation failed:', result.error);
 * }
 * ```
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { success: false; error: ValidationError } {
  return result.success === false;
}

/**
 * Checks if a validation result has any issues
 * @param result - The validation result to check
 * @returns True if the result is a failure with at least one issue
 * @example
 * ```ts
 * if (hasValidationIssues(result)) {
 *   result.error?.issues?.forEach(issue => {
 *     console.error(`${issue.path.join('.')}: ${issue.message}`);
 *   });
 * }
 * ```
 */
export function hasValidationIssues<T>(result: ValidationResult<T>): boolean {
  return (
    isValidationFailure(result) &&
    result.error?.issues !== undefined &&
    result.error.issues.length > 0
  );
}

/**
 * Checks if a value appears to be a Valibot schema
 * @param value - The value to check
 * @returns True if the value has the structure of a Valibot schema
 * @example
 * ```ts
 * import * as v from 'valibot';
 * const schema = v.string();
 * if (isValibotSchema(schema)) {
 *   // Can safely use as Valibot schema
 * }
 * ```
 */
export function isValibotSchema(value: unknown): boolean {
  return (
    isObject(value) &&
    hasProperty(value, '_run') &&
    typeof value._run === 'function'
  );
}

/**
 * Checks if a value is a manual validation schema
 * @param value - The value to check
 * @returns True if the value is a manual schema with validate function
 * @example
 * ```ts
 * const schema = {
 *   type: 'manual' as const,
 *   validate: (data) => ({ success: true, data })
 * };
 * if (isManualSchema(schema)) {
 *   // Can use schema.validate()
 * }
 * ```
 */
/**
 * Checks if a value is a manual validation schema
 * @deprecated Manual schemas are no longer supported. Use valibot schemas instead.
 * @param value - The value to check
 * @returns Always returns false as manual schemas are deprecated
 */
/**
 * Checks if a value is a manual validation schema
 * @deprecated Manual schemas are no longer supported. Use valibot schemas instead.
 * @param _value - The value to check (unused)
 * @returns Always returns false as manual schemas are deprecated
 */
export function isManualSchema(_value: unknown): boolean {
  // Manual schemas are no longer supported
  return false;
}

/**
 * Checks if an object has all required properties
 * @param obj - The object to check
 * @param props - Array of property names that must exist
 * @returns True if all properties exist on the object
 * @example
 * ```ts
 * const config = { host: 'localhost', port: 3000 };
 * if (hasRequiredSchemaProperties(config, ['host', 'port'])) {
 *   // config has both host and port properties
 * }
 * ```
 */
export function hasRequiredSchemaProperties(
  obj: unknown,
  props: string[]
): boolean {
  if (!isObject(obj)) return false;
  return props.every((prop) => hasProperty(obj, prop));
}

/**
 * Type guard to check if a value is a validation issue
 * @param value - The value to check
 * @returns True if the value is a validation issue with kind and message
 * @example
 * ```ts
 * if (isValidationIssue(error)) {
 *   console.error(`${error.kind}: ${error.message}`);
 * }
 * ```
 */
export function isValidationIssue(value: unknown): value is ValidationError {
  return (
    isObject(value) &&
    hasProperty(value, 'kind') &&
    hasProperty(value, 'message') &&
    typeof value.message === 'string'
  );
}

/**
 * Checks if a value is a field definition with a type property
 * @param value - The value to check
 * @returns True if the value has a string type property
 * @example
 * ```ts
 * const field = { type: 'string', required: true };
 * if (isFieldDefinition(field)) {
 *   console.log('Field type:', field.type);
 * }
 * ```
 */
export function isFieldDefinition(value: unknown): boolean {
  return (
    isObject(value) &&
    hasProperty(value, 'type') &&
    typeof value.type === 'string'
  );
}

/**
 * Checks if a field schema has a default value defined
 * @param fieldSchema - The field schema to check
 * @returns True if defaultValue exists and is not undefined
 * @example
 * ```ts
 * const field = { type: 'string', defaultValue: 'hello' };
 * if (hasDefaultValue(field)) {
 *   // field.defaultValue is available
 * }
 * ```
 */
export function hasDefaultValue(fieldSchema: unknown): boolean {
  return (
    isObject(fieldSchema) &&
    hasProperty(fieldSchema, 'defaultValue') &&
    fieldSchema.defaultValue !== undefined
  );
}

/**
 * Checks if a field schema has enum values defined
 * @param fieldSchema - The field schema to check
 * @returns True if enum array exists and is not empty
 * @example
 * ```ts
 * const field = { type: 'string', enum: ['red', 'green', 'blue'] };
 * if (hasEnumValues(field)) {
 *   // field.enum is a non-empty array
 * }
 * ```
 */
export function hasEnumValues(fieldSchema: unknown): boolean {
  return (
    isObject(fieldSchema) &&
    hasProperty(fieldSchema, 'enum') &&
    Array.isArray(fieldSchema.enum) &&
    fieldSchema.enum.length > 0
  );
}

/**
 * Checks if a field schema has a minimum value constraint
 * @param fieldSchema - The field schema to check
 * @returns True if minValue exists and is a number
 * @example
 * ```ts
 * const field = { type: 'number', minValue: 0 };
 * if (hasMinValue(field)) {
 *   // field.minValue is a number
 * }
 * ```
 */
export function hasMinValue(fieldSchema: unknown): boolean {
  return (
    isObject(fieldSchema) &&
    hasProperty(fieldSchema, 'minValue') &&
    typeof fieldSchema.minValue === 'number'
  );
}

/**
 * Checks if a field schema has a maximum value constraint
 * @param fieldSchema - The field schema to check
 * @returns True if maxValue exists and is a number
 * @example
 * ```ts
 * const field = { type: 'number', maxValue: 100 };
 * if (hasMaxValue(field)) {
 *   // field.maxValue is a number
 * }
 * ```
 */
export function hasMaxValue(fieldSchema: unknown): boolean {
  return (
    isObject(fieldSchema) &&
    hasProperty(fieldSchema, 'maxValue') &&
    typeof fieldSchema.maxValue === 'number'
  );
}
