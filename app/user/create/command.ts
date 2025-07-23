import type { CommandContext } from '../../../dist/types/index.js';
import type { CreateUserData } from './params.js';
import type { AppEnv } from '../../env.js';

export default async function createCommand(context: CommandContext<CreateUserData, AppEnv>) {
  // バリデーション済みのデータを使用
  const { name, email } = context.validatedData;
  const { API_KEY, NODE_ENV } = context.env;

  console.log(`🔄 Creating user: ${name} (${email})`);
  console.log(`Environment: ${NODE_ENV}, API Key: ${API_KEY}`);

  // 実際の処理をここに実装
  // 例: await createUser({ name, email });

  console.log('✅ User created successfully!');
}