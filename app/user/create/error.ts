import type { ErrorContext, ErrorHandler } from '../../../dist/types/index.js';
import { isValidationError } from '../../../dist/types/index.js';
import type { CreateUserData } from './params.js';

export default async function createErrorHandler(context: ErrorContext<CreateUserData, typeof process.env>): Promise<ErrorHandler<CreateUserData, typeof process.env>> {
    const { error } = context;
    console.error('❌ User creation failed:');

    if (isValidationError(error)) {
      console.error('');
      for (const issue of error.issues) {
        const field = issue.path && issue.path.length > 0
          ? issue.path.map(p => p.key).join('.')
          : 'email';
        console.error(`  • ${field}: ${issue.message}`);
      }
    } else if (error instanceof Error) {
      console.error(`  ${error.message}`);
    } else {
      console.error('  Unknown error');
    }

    console.error('');
    console.error('💡 Usage examples:');
    console.error('  user create --name "John Doe" --email "john@example.com"');
    console.error('  user create "John Doe" "john@example.com"');

    process.exit(1);
};