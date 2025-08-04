import type { ErrorContext } from '../../../dist/types/index.js';

export default async function createErrorHandler(context: ErrorContext<any, typeof process.env>) {
  const { error } = context;
  console.error('❌ Custom error handler triggered');

  // Type guard for error
  const err = error as any;
  console.error(`Error: ${err.message || 'Unknown error'}`);

  if (err.issues) {
    console.error('\nValidation issues:');
    for (const issue of err.issues) {
      console.error(`  - ${issue.message}`);
    }
  }

  process.exit(1);
}