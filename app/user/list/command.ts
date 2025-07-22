import type { CommandDefinition, BaseCommandContext } from '../../../dist/types/index.js';

export default function createCommand(): CommandDefinition {
  return {
    handler: async (context: BaseCommandContext) => {
      const limit = Number(context.options.limit) || 10;

      console.log('📋 User List:');
      for (let i = 1; i <= limit; i++) {
        console.log(`  ${i}. User ${i} (user${i}@example.com)`);
      }
      console.log(`\n📊 Showing ${limit} users`);
    }
  };
}