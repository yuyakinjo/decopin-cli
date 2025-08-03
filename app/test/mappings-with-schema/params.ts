import * as v from 'valibot';
import type { ParamsHandler, BaseContext } from '../../../dist/types/index.js';

// mappingsで基本的な構造を定義し、schemaで詳細なバリデーションを追加
export default function createParams(context: BaseContext<typeof process.env>): ParamsHandler {
  return {
    // 詳細なバリデーション用のschema
    schema: v.object({
      email: v.pipe(
        v.string(),
        v.email('Invalid email format'),
        v.endsWith('@example.com', 'Email must end with @example.com')
      ),
      password: v.pipe(
        v.string(),
        v.minLength(8, 'Password must be at least 8 characters'),
        v.regex(/[A-Z]/, 'Password must contain uppercase letter'),
        v.regex(/[0-9]/, 'Password must contain number')
      ),
    }),
  };
}