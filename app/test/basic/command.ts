import type { BaseCommandContext } from '../../../dist/types/index.js';

export default async function basicCommand(context: BaseCommandContext) {
  console.log('📋 Basic command executed!');
  console.log('📁 This command uses only command.ts');
  console.log('✅ No validation or custom error handling');

  if (context.args && context.args.length > 0) {
    console.log(`📝 Received arguments: ${context.args.join(', ')}`);
  }

  if (context.options && Object.keys(context.options).length > 0) {
    console.log(`⚙️  Received options: ${JSON.stringify(context.options)}`);
  }
}