import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CustomErrorTestData } from './params.js';

export default function customErrorCommand(context: CommandContext<CustomErrorTestData>): CommandDefinition<CustomErrorTestData> {
  // バリデーション済みのデータを使用
  const { username, age, role } = context.validatedData!;

  return {
    handler: async () => {
      console.log('🎯 Custom error command executed!');
      console.log('📁 This command uses command.ts + params.ts + error.ts');
      console.log('✅ Includes validation with custom error handling');
      console.log('');

      console.log('👤 User Profile Created:');
      console.log(`   Username: ${username}`);
      console.log(`   Age: ${Number(age)} years old`);
      console.log(`   Role: ${role}`);
      console.log('');

      // ロールベースのメッセージ
      switch (role) {
        case 'admin':
          console.log('🔑 Admin privileges granted!');
          break;
        case 'user':
          console.log('👥 Standard user access granted!');
          break;
        case 'guest':
          console.log('👀 Guest access granted!');
          break;
      }

      console.log('');
      console.log('✅ Custom error test completed successfully!');
    }
  };
}