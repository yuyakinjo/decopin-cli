import type { CommandDefinition, CommandContext } from '../../../dist/types/command.js';
import type { CreateUserData } from './params.js';

export default function createCommand(): CommandDefinition<CreateUserData> {
  return {
    metadata: {
      name: 'create',
      description: 'Create a new user',
      examples: [
        'user create --name john --email john@example.com',
        'user create john john@example.com'
      ]
    },
    handler: async (context: CommandContext<CreateUserData>) => {
      // バリデーション済みのデータを使用
      const { name, email } = context.validatedData!;

      console.log(`🔄 Creating user: ${name} (${email})`);

      // 実際の処理をここに実装
      // 例: await createUser({ name, email });

      console.log('✅ User created successfully!');
    }
  };
}