import type { CommandHelpMetadata } from '../../../dist/types/command.js';

export const help: CommandHelpMetadata = {
  name: 'list',
  description: 'List all users in the system',
  examples: [
    'user list',
    'user list --limit 5',
    'user list --format json'
  ],
  aliases: ['ls', 'show'],
  additionalHelp: 'Displays a paginated list of all users in the system with their basic information.'
};
