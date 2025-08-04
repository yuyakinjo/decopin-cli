import type { ParamsHandler } from '../../src/types/validation.js';

// contextを使わないパラメータ定義の例
export default function createParams(): ParamsHandler {
  return {
    mappings: [
      {
        field: 'message',
        type: 'string',
        argIndex: 0,
        required: false,
        defaultValue: 'Hello from simple command!',
        description: 'Message to display'
      }
    ]
  };
}