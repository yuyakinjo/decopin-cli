import type { ErrorContext } from '../../../dist/types/index.js';
import { isValidationError } from '../../../dist/types/index.js';
import type { CustomErrorTestData } from './params.js';

export default async function createErrorHandler(context: ErrorContext<CustomErrorTestData, typeof process.env>) {
  const { error } = context;
  console.error('❌ Custom error handler triggered');

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('Error: Unknown error');
  }

  if (isValidationError(error)) {
    console.error('\nValidation issues:');
    for (const issue of error.issues) {
      console.error(`  - ${issue.message}`);
    }
  }

  process.exit(1);
}