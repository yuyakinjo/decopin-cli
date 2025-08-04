import type { CommandContext } from '../../src/types/context.js';

interface ContextData {
  name: string;
}

// contextを使うコマンドの例
export default async function contextDemoCommand(context: CommandContext<ContextData, typeof process.env>) {
  const { validatedData, env, args } = context;
  
  console.log(`Hello, ${validatedData.name}!`);
  console.log(`Running in ${env.NODE_ENV || 'development'} mode`);
  console.log(`Original args: ${args.join(' ')}`);
}