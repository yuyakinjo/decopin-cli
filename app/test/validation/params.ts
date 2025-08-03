import * as v from 'valibot';
import type { ParamsHandler, Context } from '../../../dist/types/index.js';

// バリデーションテスト用のスキーマ
const ValidationTestSchema = v.object({
  message: v.pipe(v.string(), v.minLength(1, 'Message is required')),
  count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
});

export type ValidationTestData = v.InferInput<typeof ValidationTestSchema>;

export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    mappings: [
      {
        field: 'message',
        type: 'string',
        option: 'message',
        argIndex: 0,
        required: true,
        description: 'Message to validate'
      },
      {
        field: 'count',
        type: 'number',
        option: 'count',
        argIndex: 1,
        defaultValue: 1,
        description: 'Count value'
      }
    ]
  };
}