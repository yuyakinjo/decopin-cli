import * as v from 'valibot';
import type { ParamsDefinition } from '../../../dist/types/command.js';

// カスタムエラーテスト用のスキーマ
const CustomErrorTestSchema = v.object({
  username: v.pipe(v.string(), v.minLength(3, 'Username must be at least 3 characters'), v.maxLength(20, 'Username must be at most 20 characters')),
  age: v.pipe(v.string(), v.transform(Number), v.integer('Age must be an integer'), v.minValue(18, 'Age must be at least 18'), v.maxValue(120, 'Age must be at most 120')),
  role: v.pipe(v.string(), v.picklist(['admin', 'user', 'guest'], 'Role must be one of: admin, user, guest')),
});

export type CustomErrorTestData = v.InferInput<typeof CustomErrorTestSchema>;

export default function createParams(): ParamsDefinition {
  return {
    schema: CustomErrorTestSchema,
    mappings: [
      {
        field: 'username',
        option: 'username',
        argIndex: 0,
      },
      {
        field: 'age',
        option: 'age',
        argIndex: 1,
      },
      {
        field: 'role',
        option: 'role',
        argIndex: 2,
      },
    ],
  };
}