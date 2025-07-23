import * as v from 'valibot';
import type { ParamsHandler } from '../../../dist/types/index.js';

// バリデーションテスト用のスキーマ
const ValidationTestSchema = v.object({
  message: v.pipe(v.string(), v.minLength(1, 'Message is required')),
  count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
});

export type ValidationTestData = v.InferInput<typeof ValidationTestSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: ValidationTestSchema,
    mappings: [
      {
        field: 'message',
        option: 'message',
        argIndex: 0,
      },
      {
        field: 'count',
        option: 'count',
        argIndex: 1,
      },
    ],
  };
}