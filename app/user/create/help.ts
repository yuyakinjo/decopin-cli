import type { HelpHandler } from '../../../dist/types/index.js';

export default function createHelp(): HelpHandler {
  return {
    name: 'create',
    description: 'Create a new user in the system',
    examples: [
      'user create john john@example.com',
      'user create "Jane Smith" jane@example.com --age 25',
      'user create alice alice@example.com --admin'
    ],
    aliases: ['add', 'new'],
    additionalHelp: 'Creates a new user account with the specified details. The user will be added to the database immediately.'
  };
}
