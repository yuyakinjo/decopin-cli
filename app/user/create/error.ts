import type { ErrorHandler, ValidationError } from '../../../dist/types/index.js';

export default async function createErrorHandler(error: ValidationError): Promise<ErrorHandler> {
    console.error('❌ User creation failed:');

    if (error.issues && error.issues.length > 0) {
      console.error('');
      for (const issue of error.issues) {
        const field = issue.path && issue.path.length > 0 
          ? issue.path.map((p: any) => typeof p === 'object' && p && 'key' in p ? p.key : p).join('.') 
          : 'email';
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