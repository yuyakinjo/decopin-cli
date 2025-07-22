import type { ErrorHandler, ValidationError } from '../../../dist/types/index.js';

export default function createErrorHandler(): ErrorHandler {
  return async (error: ValidationError) => {
    console.error('❌ User creation failed:');

    if (error.issues && error.issues.length > 0) {
      console.error('');
      for (const issue of error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
        console.error(`  • ${field}: ${issue.message}`);
      }
    } else {
      console.error(`  ${error.message}`);
    }

    console.error('');
    console.error('💡 Usage examples:');
    console.error('  user create --name "John Doe" --email "john@example.com"');
    console.error('  user create "John Doe" "john@example.com"');

    process.exit(1);
  };
}