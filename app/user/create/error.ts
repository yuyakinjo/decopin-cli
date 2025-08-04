import type { ErrorContext } from '../../../dist/types/index.js';

export default async function createErrorHandler(context: ErrorContext<any, typeof process.env>) {
    const { error } = context;
    console.error('❌ User creation failed:');

    // Type guard for validation error
    const validationError = error as any;

    if (validationError.issues && validationError.issues.length > 0) {
      console.error('');
      for (const issue of validationError.issues) {
        const field = issue.path && issue.path.length > 0
          ? issue.path.map((p: any) => typeof p === 'object' && p && 'key' in p ? p.key : p).join('.')
          : 'email';
        console.error(`  • ${field}: ${issue.message}`);
      }
    } else {
      console.error(`  ${validationError.message || 'Unknown error'}`);
    }

    console.error('');
    console.error('💡 Usage examples:');
    console.error('  user create --name "John Doe" --email "john@example.com"');
    console.error('  user create "John Doe" "john@example.com"');

    process.exit(1);
}