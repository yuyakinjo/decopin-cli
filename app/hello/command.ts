import type { CommandDefinition, CommandContext } from '../../dist/types/command.js';
import type { HelloData } from './params.js';

export default function createCommand(context: CommandContext<HelloData>): CommandDefinition<HelloData> {
  // バリデーション済みのデータを使用
  const { name } = context.validatedData!;

  return {
    metadata: {
      name: 'hello',
      description: 'Say hello to someone',
      examples: ['hello world', 'hello --name Alice']
    },
    handler: async () => {
      console.log(`Hello, ${name}!!!`);
    }
  };
}