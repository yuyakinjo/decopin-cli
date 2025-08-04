import type { ParamsHandler, ParamsContext } from '../../../dist/types/index.js';

// mappingsだけで基本的なバリデーションを行う例
export default function createParams(context: ParamsContext<typeof process.env>): ParamsHandler {
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        option: 'name',
        argIndex: 0,
        required: true,
        description: 'User name'
      },
      {
        field: 'age',
        type: 'number',
        option: 'age',
        argIndex: 1,
        defaultValue: 18,
        description: 'User age'
      },
      {
        field: 'active',
        type: 'boolean',
        option: 'active',
        defaultValue: true,
        description: 'Is active user'
      }
    ],
  };
}