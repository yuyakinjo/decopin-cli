import * as v from 'valibot';
import type { ParamsHandler, ParamsContext } from '../../dist/types/index.js';

// Hello コマンドのデータスキーマ
const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(context: ParamsContext): ParamsHandler {
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        option: 'name',
        argIndex: 0,
        defaultValue: 'World',
      },
    ],
  };
}