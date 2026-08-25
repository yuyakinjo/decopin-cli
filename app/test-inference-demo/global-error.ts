import type {
  GlobalErrorContext,
  GlobalErrorHandler,
} from '../../dist/types/index.js';

// Global error handler with context
export default function createGlobalErrorHandler(
  context: GlobalErrorContext<typeof process.env>
): GlobalErrorHandler {
  // Access environment during handler creation
  const isDevelopment = context.env.NODE_ENV === 'development';
  const supportEmail = context.env.SUPPORT_EMAIL || 'support@example.com';

  return async (error: unknown) => {
    console.error('\n❌ An unexpected error occurred\n');

    // Error details
    if (error instanceof Error) {
      console.error('Error:', error.message);

      // Show stack trace in development
      if (isDevelopment && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', error);
    }

    // Help message
    console.error('\n💡 Need help?');
    console.error(`  • Contact support: ${supportEmail}`);
    console.error('  • Check the documentation: https://docs.example.com');
    console.error('  • Run with --help for usage information');

    if (!isDevelopment) {
      console.error('  • Set NODE_ENV=development for detailed errors');
    }

    process.exit(1);
  };
}
