import * as v from 'valibot';
import type { ParamsHandler } from '../../../dist/types/index.js';

// カスタムエラー用のスキーマ
const CustomErrorTestSchema = v.object({
  input: v.pipe(v.string(), v.minLength(1, 'Input cannot be empty')),
});

export type CustomErrorTestData = v.InferInput<typeof CustomErrorTestSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: CustomErrorTestSchema,
    mappings: [
      {
        field: 'input',
        option: 'input',
        argIndex: 0,
      },
    ],
  };
}