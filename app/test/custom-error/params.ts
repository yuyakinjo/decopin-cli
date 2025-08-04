import * as v from 'valibot';
import type { ParamsHandler, ParamsContext } from '../../../dist/types/index.js';

// カスタムエラー用のスキーマ
const CustomErrorTestSchema = v.object({
  input: v.pipe(v.string(), v.minLength(1, 'Input cannot be empty')),
});

export type CustomErrorTestData = v.InferInput<typeof CustomErrorTestSchema>;

export default function createParams(context: ParamsContext<typeof process.env>): ParamsHandler {
  return {
    mappings: [
      {
        field: 'input',
        type: 'string',
        option: 'input',
        argIndex: 0,
        required: true,
        description: 'Input value'
      }
    ]
  };
}