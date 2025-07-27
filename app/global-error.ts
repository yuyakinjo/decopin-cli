/**
 * Global error handler for uncaught errors
 * This handler runs when no command-specific error.ts is available
 */
export default function createGlobalErrorHandler() {
  return async (error: any) => {
    // Enhanced error display
    console.error('\n❌ An error occurred\n');

    // Handle different error types
    if (error.issues && Array.isArray(error.issues)) {
      // Valibot validation error
      console.error('📋 Validation Error:');
      error.issues.forEach((issue: any) => {
        const path = issue.path?.map((p: any) => p.key).join('.') || 'value';
        console.error(`  • ${path}: ${issue.message}`);
      });
    } else if (error.code === 'ERR_MODULE_NOT_FOUND') {
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
    if ((process.env.DEBUG || process.env.CLI_DEBUG) && error.stack) {
      console.error('\n📍 Stack Trace:');
      console.error(error.stack);
    }

    // Helpful suggestions based on error type
    console.error('\n💡 Tips:');
    if (error.issues && Array.isArray(error.issues)) {
      console.error('  • Check your input values against the required format');
      console.error('  • Use --help to see parameter details');
    } else if (error.code === 'ERR_MODULE_NOT_FOUND') {
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