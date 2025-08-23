import type {
  CLIError,
  ModuleError,
  ValidationError,
} from '../../types/errors.js';

/**
 * Type guard for validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof Error &&
    'issues' in error &&
    Array.isArray((error as ValidationError).issues)
  );
}

/**
 * Type guard for module errors
 */
export function isModuleError(error: unknown): error is ModuleError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as ModuleError).code === 'string'
  );
}

/**
 * Type guard for errors with stack traces
 */
export function hasStackTrace(
  error: unknown
): error is Error & { stack: string } {
  return error instanceof Error && typeof error.stack === 'string';
}

/**
 * Create a validation error with issues
 */
export function createValidationError(
  message: string,
  issues: ValidationError['issues'] = []
): ValidationError {
  const error = new Error(message) as ValidationError;
  error.issues = issues;
  return error;
}

/**
 * Create a module error with code
 */
export function createModuleError(
  message: string,
  code: string = 'ERR_MODULE_NOT_FOUND'
): ModuleError {
  const error = new Error(message) as ModuleError;
  error.code = code;
  return error;
}

// Re-export formatting utilities
export { formatError } from './formatting.js';
