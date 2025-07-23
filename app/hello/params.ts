import * as v from 'valibot';
import type { ParamsHandler } from '../../dist/types/index.js';

// Hello コマンドのデータスキーマ
const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: HelloSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
      },
    ],
  };
}