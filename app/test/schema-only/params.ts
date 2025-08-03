import * as v from 'valibot';
import type { ParamsHandler, Context } from '../../../dist/types/index.js';

// schemaだけで詳細なバリデーションを行う例
const UserSchema = v.object({
  // arg0, arg1などの位置引数を処理
  arg0: v.pipe(
    v.string(),
    v.email('Invalid email format'),
    v.endsWith('@example.com', 'Email must end with @example.com')
  ),
  arg1: v.pipe(
    v.string(),
    v.minLength(8, 'Password must be at least 8 characters'),
    v.regex(/[A-Z]/, 'Password must contain uppercase letter'),
    v.regex(/[0-9]/, 'Password must contain number')
  ),
  // オプション引数
  role: v.optional(
    v.pipe(
      v.string(),
      v.picklist(['admin', 'user', 'guest'], 'Invalid role')
    ),
    'user'
  )
});

export type UserData = v.InferInput<typeof UserSchema>;

export default function createParams(context: Context<typeof process.env>): ParamsHandler {
  return {
    schema: UserSchema
  };
}