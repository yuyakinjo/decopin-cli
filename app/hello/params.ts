import * as v from 'valibot';
import type { ParamsDefinition } from '../../dist/types/command.js';

// Hello コマンドのデータスキーマ
const HelloSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name cannot be empty')),
});

export type HelloData = v.InferInput<typeof HelloSchema>;

export default function createParams(): ParamsDefinition {
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