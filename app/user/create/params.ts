import * as v from 'valibot';
import type { ParamsHandler } from '../../../dist/types/index.js';

// ユーザー作成データのスキーマ
const CreateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
});

export type CreateUserData = v.InferInput<typeof CreateUserSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: CreateUserSchema,
    mappings: [
      {
        field: 'name',
        option: 'name',
        argIndex: 0,
      },
      {
        field: 'email',
        option: 'email',
        argIndex: 1,
      },
    ],
  };
}