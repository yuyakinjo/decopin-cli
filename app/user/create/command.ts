import type { CommandContext } from '../../../dist/types/index.js';
import type { CreateUserData } from './params.js';

export default async function createCommand(context: CommandContext<CreateUserData>) {
  // バリデーション済みのデータを使用
  const { name, email } = context.validatedData;

  console.log(`🔄 Creating user: ${name} (${email})`);

  // 実際の処理をここに実装
  // 例: await createUser({ name, email });

  console.log('✅ User created successfully!');
}