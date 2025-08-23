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

// Re-export error utilities from utils/errors
export {
  createModuleError,
  createValidationError,
  formatError,
  hasStackTrace,
  isModuleError,
  isValidationError,
} from '../utils/errors/index.js';
