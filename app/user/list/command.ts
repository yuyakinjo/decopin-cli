import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CreateUserData } from '../create/params.js';

export default function createCommand(context: CommandContext): CommandDefinition {
  return {
    handler: async (context: CommandContext) => {
      const limit = Number(context.options.limit) || 10;

      console.log('📋 User List:');
      for (let i = 1; i <= limit; i++) {
        console.log(`  ${i}. User ${i} (user${i}@example.com)`);
      }
      console.log(`\n📊 Showing ${limit} users`);
    }
  };
}