import type { Context, ParamsHandler } from '../../src/types/index.js';

// contextを使うパラメータ定義の例
export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  // contextから環境変数を参照して動的にデフォルト値を設定
  const defaultName = context.env.USER || 'World';
  
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        argIndex: 0,
        required: true,
        defaultValue: defaultName,
        description: 'Name to greet'
      }
    ]
  };
}