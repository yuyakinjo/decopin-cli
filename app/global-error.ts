// Type guards for error parsing
import type {
  GlobalErrorContext,
  GlobalErrorHandler,
} from '../dist/types/index.js';
import {
  isValidationError,
  isModuleError,
  hasStackTrace,
} from '../dist/types/index.js';

/**
 * Global error handler for uncaught errors
 * This handler runs when no command-specific error.ts is available
 */
export default function createGlobalErrorHandler(
  context: GlobalErrorContext<typeof process.env>
): GlobalErrorHandler {
  return async (error: unknown) => {
    // Enhanced error display
    console.error('\n❌ An error occurred\n');

    // Handle different error types
    if (isValidationError(error)) {
      // Valibot validation error
      console.error('📋 Validation Error:');
      error.issues.forEach((issue) => {
        const path =
          issue.path && issue.path.length > 0
            ? issue.path.map((p) => p.key).join('.')
            : 'value';
        const message = issue.message || 'Validation failed';
        console.error(`  • ${path}: ${message}`);
      });
    } else if (isModuleError(error)) {
      // Module loading error
      console.error('📦 Module Error:');
      console.error('  The required module could not be found.');
      console.error(`  ${error.message}`);
    } else if (error instanceof Error) {
      // Standard error with message
      console.error('💥 Error Details:');
      console.error(`  ${error.message}`);
    } else {
      // Unknown error type
      console.error('🔥 Unknown Error:');
      console.error(error);
    }

    // Debug mode - show stack trace
    if ((context.env.DEBUG || context.env.CLI_DEBUG) && hasStackTrace(error)) {
      console.error('\n📍 Stack Trace:');
      console.error(error.stack);
    }

    // Helpful suggestions based on error type
    console.error('\n💡 Tips:');
    if (isValidationError(error)) {
      console.error('  • Check your input values against the required format');
      console.error('  • Use --help to see parameter details');
    } else if (isModuleError(error)) {
      console.error('  • Ensure all required files are present');
      console.error('  • Check your project structure');
    } else {
      console.error('  • Check your command syntax');
      console.error('  • Use --help to see available options');
    }
    console.error('  • Set DEBUG=true for more details');

    process.exit(1);
  };
}
