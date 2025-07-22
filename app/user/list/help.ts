import type { CommandHelpMetadata } from '../../../dist/types/index.js';

export const help: CommandHelpMetadata = {
  name: 'list',
  description: 'List all users in the system with pagination support',
  examples: [
    'user list',
    'user list --limit 5',
    'user list --format json',
    'user list --sort name'
  ],
  aliases: ['ls', 'show', 'all'],
  additionalHelp: 'Displays a paginated list of all users in the system with their basic information. Supports various output formats and sorting options.'
};
