import * as v from 'valibot';
import type { ParamsHandler, BaseContext } from '../../../dist/types/index.js';

// カスタムエラー用のスキーマ
const CustomErrorTestSchema = v.object({
  input: v.pipe(v.string(), v.minLength(1, 'Input cannot be empty')),
});

export type CustomErrorTestData = v.InferInput<typeof CustomErrorTestSchema>;

export default function createParams(context: BaseContext<typeof process.env>): ParamsHandler {
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