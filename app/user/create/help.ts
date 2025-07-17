import type { CommandHelpMetadata } from '../../../dist/types/command.js';

export const help: CommandHelpMetadata = {
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
