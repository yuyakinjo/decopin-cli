/**
 * Error type definitions for decopin-cli
 * Provides comprehensive type safety for error handling
 */

/**
 * Valibot validation issue structure
 */
export interface ValidationIssue {
  path?: Array<{
    key: string | number;
    value?: unknown;
  }>;
  message: string;
  expected?: string;
  received?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Validation error compatible with Valibot errors
 */
export interface ValidationError extends Error {
  issues: ValidationIssue[];
}

/**
 * Node.js module error
 */
export interface ModuleError extends Error {
  code: 'ERR_MODULE_NOT_FOUND' | 'ERR_INVALID_MODULE_SPECIFIER' | string;
}

/**
 * Union type of all possible CLI errors
 */
export type CLIError = Error | ValidationError | ModuleError;

/**
 * Type guard for validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof Error &&
    'issues' in error &&
    Array.isArray((error as any).issues)
  );
}

/**
 * Type guard for module errors
 */
export function isModuleError(error: unknown): error is ModuleError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

/**
 * Type guard for errors with stack traces
 */
export function hasStackTrace(error: unknown): error is Error & { stack: string } {
  return error instanceof Error && typeof error.stack === 'string';
}

/**
 * Format error for display
 */
export function formatError(error: CLIError): {
  type: 'validation' | 'module' | 'runtime';
  message: string;
  details?: string[];
} {
  if (isValidationError(error)) {
    return {
      type: 'validation',
      message: 'Validation error',
      details: error.issues.map(issue => {
        const path = issue.path?.map(p => p.key).join('.') || 'value';
        return `${path}: ${issue.message}`;
      })
    };
  }

  if (isModuleError(error)) {
    return {
      type: 'module',
      message: 'Module loading error',
      details: [error.message]
    };
  }

  return {
    type: 'runtime',
    message: error.message || 'Unknown error',
    details: []
  };
}