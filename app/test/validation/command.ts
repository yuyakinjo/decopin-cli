import type { CommandContext } from '../../../dist/types/index.js';
import type { ValidationTestData } from './params.js';

export default async function validationCommand(
  context: CommandContext<ValidationTestData>
) {
  // バリデーション済みのデータを使用
  const { message, count } = context.validatedData;

  console.log('🔍 Validation command executed!');
  console.log('📁 This command uses command.ts + params.ts');
  console.log('✅ Includes validation with default error handling');
  console.log('');

  console.log(`💬 Message: "${message}"`);
  console.log(`🔢 Count: ${count}`);
  console.log('');

  console.log('📋 Repeating message:');
  for (let i = 1; i <= Number(count); i++) {
    console.log(`  ${i}. ${message}`);
  }

  console.log('');
  console.log('✅ Validation test completed successfully!');
}
