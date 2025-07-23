import type { CommandContext } from '../../../dist/types/index.js';
import type { ListData } from './params.js';

export default async function createCommand(context: CommandContext<ListData>) {
  const limit = context.validatedData.limit;

  console.log('📋 User List:');
  for (let i = 1; i <= limit; i++) {
    console.log(`  ${i}. User ${i} (user${i}@example.com)`);
  }
  console.log(`\n📊 Showing ${limit} users`);
}