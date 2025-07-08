import type { CommandDefinition, CommandContext } from '../../../src/types/command.js';

const command: CommandDefinition = {
  metadata: {
    name: 'list',
    description: 'List all users',
    examples: [
      'user list',
      'user list --limit 10'
    ]
  },
  handler: async (context: CommandContext) => {
    const limit = Number(context.options.limit) || 10;

    console.log('📋 User List:');
    for (let i = 1; i <= limit; i++) {
      console.log(`  ${i}. User ${i} (user${i}@example.com)`);
    }
    console.log(`\n📊 Showing ${limit} users`);
  }
};

export default command;