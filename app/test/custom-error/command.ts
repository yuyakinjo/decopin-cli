import type { CommandContext } from '../../../dist/types/index.js';
import type { CustomErrorTestData } from './params.js';

export default async function createCommand(context: CommandContext<CustomErrorTestData>) {
  // バリデーション済みのデータを使用
  const { input } = context.validatedData;

  console.log(`Processing input: ${input}`);

  // カスタムエラーのテスト
  if (input === 'trigger-error') {
    throw new Error('This is a custom error test');
  }

  console.log('✅ Command executed successfully!');
}