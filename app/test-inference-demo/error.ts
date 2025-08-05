import type { ErrorContext, ErrorHandler } from '../../dist/types/index.js';
import { isValidationError, isModuleError } from '../../dist/types/index.js';

interface UserData {
  name: string;
  verbose: boolean;
}

// Error handler with full context
export default async function createErrorHandler(context: ErrorContext<UserData, typeof process.env>): Promise<ErrorHandler<UserData, typeof process.env>> {
  const { error, validatedData, env } = context;
  
  // Show detailed errors in development
  const showDetails = env.NODE_ENV === 'development' || env.DEBUG;
  
  console.error('❌ Command failed');
  
  // Use type guards for better error handling
  if (isValidationError(error)) {
    console.error('\nValidation errors:');
    error.issues?.forEach(issue => {
      const path = issue.path ? issue.path.join('.') : 'field';
      console.error(`  • ${path}: ${issue.message}`);
    });
  } else if (isModuleError(error)) {
    console.error('\nModule error:', error.code);
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error('\nError:', error.message);
    if (showDetails && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else {
    console.error('\nUnknown error:', error);
  }
  
  // Access to original context data
  if (validatedData && showDetails) {
    console.error('\nContext data:', validatedData);
  }
  
  console.error('\n💡 Use --help for usage information');
  
  process.exit(1);
};