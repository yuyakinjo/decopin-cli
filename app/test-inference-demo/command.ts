import type { CommandContext } from '../../dist/types/index.js';

interface UserData {
  name: string;
  verbose: boolean;
}

// Command with full type safety
export default async function createCommand(
  context: CommandContext<UserData, typeof process.env>
) {
  // TypeScript knows:
  // - context.validatedData is UserData
  // - context.env is typeof process.env
  // - All other context properties are available

  const { name, verbose } = context.validatedData;

  // Type-safe environment variable access
  const apiUrl = context.env.API_URL || 'https://api.example.com';

  if (verbose) {
    console.log(`Creating user ${name} at ${apiUrl}`);
    console.log('Command line args:', context.args);
    console.log('Options:', context.options);
    console.log('Dynamic params:', context.params);
  } else {
    console.log(`User ${name} created successfully`);
  }

  // Access to helper functions
  if (context.options.help) {
    context.showHelp();
  }
}