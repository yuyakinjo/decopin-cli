import * as v from 'valibot';
import type { ParamsDefinition } from '../../../dist/types/index.js';

// バリデーションテスト用のスキーマ
const ValidationTestSchema = v.object({
  message: v.pipe(v.string(), v.minLength(1, 'Message is required')),
  count: v.pipe(v.string(), v.transform(Number), v.integer('Count must be an integer'), v.minValue(1, 'Count must be at least 1')),
});

export type ValidationTestData = v.InferInput<typeof ValidationTestSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schemaType: 'valibot',
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