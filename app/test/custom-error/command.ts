import type { CommandDefinition, CommandContext } from '../../../dist/types/index.js';
import type { CustomErrorTestData } from './params.js';

export default function createCommand(context: CommandContext<CustomErrorTestData>): CommandDefinition<CustomErrorTestData> {
  // バリデーション済みのデータを使用
  const { input } = context.validatedData;

  return {
    handler: async () => {
      console.log(`Processing input: ${input}`);

      // カスタムエラーのテスト
      if (input === 'trigger-error') {
        throw new Error('This is a custom error test');
      }

      console.log('✅ Command executed successfully!');
    },
  };
}