// Type guards for error parsing
import type { GlobalErrorContext, GlobalErrorHandler } from '../dist/types/index.js';

function hasIssues(error: unknown): error is { issues: unknown[] } {
  return typeof error === 'object' && error !== null && 'issues' in error && Array.isArray((error as any).issues);
}

function hasCode(error: unknown): error is { code: string; message: string } {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

function hasStack(error: unknown): error is { stack: string } {
  return typeof error === 'object' && error !== null && 'stack' in error && typeof (error as any).stack === 'string';
}

/**
 * Global error handler for uncaught errors
 * This handler runs when no command-specific error.ts is available
 */
export default function createGlobalErrorHandler(context: GlobalErrorContext<typeof process.env>): GlobalErrorHandler {
  return async (error: unknown) => {
    // Enhanced error display
    console.error('\n❌ An error occurred\n');

    // Handle different error types
    if (hasIssues(error)) {
      // Valibot validation error
      console.error('📋 Validation Error:');
      error.issues.forEach((issue: unknown) => {
        const isValidIssue = typeof issue === 'object' && issue !== null;
        const path = isValidIssue && 'path' in issue && Array.isArray((issue as any).path)
          ? (issue as any).path.map((p: unknown) => typeof p === 'object' && p !== null && 'key' in p ? (p as any).key : '').join('.')
          : 'value';
        const message = isValidIssue && 'message' in issue ? String((issue as any).message) : 'Validation failed';
        console.error(`  • ${path}: ${message}`);
      });
    } else if (hasCode(error)) {
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
    if ((context.env.DEBUG || context.env.CLI_DEBUG) && hasStack(error)) {
      console.error('\n📍 Stack Trace:');
      console.error(error.stack);
    }

    // Helpful suggestions based on error type
    console.error('\n💡 Tips:');
    if (hasIssues(error)) {
      console.error('  • Check your input values against the required format');
      console.error('  • Use --help to see parameter details');
    } else if (hasCode(error)) {
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