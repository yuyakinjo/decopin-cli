import type { CommandContext } from '../../dist/types/index.js';
import type { HelloData } from './params.js';

export default async function createCommand(context: CommandContext<HelloData>) {
  // バリデーション済みのデータを使用
  const { name } = context.validatedData;

  console.log(`Hello, ${name}!!!`);
}