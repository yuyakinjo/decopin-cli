import type { CLIError } from '../../types/errors.js';
import { isModuleError, isValidationError } from './index.js';

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
      details: error.issues.map((issue) => {
        const path = issue.path?.map((p) => p.key).join('.') || 'value';
        return `${path}: ${issue.message}`;
      }),
    };
  }

  if (isModuleError(error)) {
    return {
      type: 'module',
      message: 'Module loading error',
      details: [error.message],
    };
  }

  return {
    type: 'runtime',
    message: error.message || 'Unknown error',
    details: [],
  };
}

/**
 * Format error for console output with colors
 */
export function formatErrorForConsole(error: CLIError): string {
  const formatted = formatError(error);

  let output = `❌ ${formatted.message}`;

  if (formatted.details && formatted.details.length > 0) {
    output +=
      '\n' + formatted.details.map((detail) => `  • ${detail}`).join('\n');
  }

  return output;
}

/**
 * Format validation issues as a readable string
 */
export function formatValidationIssues(
  issues: Array<{ path?: Array<{ key: string | number }>; message: string }>
): string {
  return issues
    .map((issue) => {
      const path = issue.path?.map((p) => p.key).join('.') || 'value';
      return `${path}: ${issue.message}`;
    })
    .join('\n');
}
