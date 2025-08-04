import type { HelpContext, HelpHandler } from '../../dist/types/index.js';

// Help handler with context
export default function createHelp(context: HelpContext<typeof process.env>): HelpHandler {
  // Can customize help based on environment
  const isDevelopment = context.env.NODE_ENV === 'development';
  
  const examples = [
    'test-inference-demo "John Doe" --verbose',
    'test-inference-demo --name "Jane Smith"'
  ];
  
  // Add development-specific examples
  if (isDevelopment) {
    examples.push('DEBUG=true test-inference-demo "Test User" --verbose');
    examples.push('NODE_ENV=production test-inference-demo --name "Prod User"');
  }
  
  return {
    name: 'test-inference-demo',
    description: 'Demonstrates type inference improvements in decopin-cli',
    examples,
    aliases: ['tid', 'demo'],
    additionalHelp: isDevelopment 
      ? '\nDevelopment mode: Additional debug options are available.\nSet DEBUG=true for verbose logging.'
      : '\nFor more information, visit: https://github.com/example/decopin-cli'
  };
}