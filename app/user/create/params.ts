import * as v from 'valibot';
import type { ParamsHandler, ParamsContext } from '../../../dist/types/index.js';

// ユーザー作成データのスキーマ
const CreateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
});

export type CreateUserData = v.InferInput<typeof CreateUserSchema>;

export default function createParams(context: ParamsContext<typeof process.env>): ParamsHandler {
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        option: 'name',
        argIndex: 0,
        required: true,
        description: 'User name'
      },
      {
        field: 'email',
        type: 'string',
        option: 'email',
        argIndex: 1,
        required: true,
        description: 'User email address',
        validation: 'email'
      }
    ]
  };
}