import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CreateUserData } from './params.js';

export default function createCommand(context: CommandContext<CreateUserData>): CommandDefinition<CreateUserData> {
  // バリデーション済みのデータを使用
  const { name, email } = context.validatedData;

  return {
    handler: async () => {
      console.log(`🔄 Creating user: ${name} (${email})`);

      // 実際の処理をここに実装
      // 例: await createUser({ name, email });

      console.log('✅ User created successfully!');
    }
  };
}