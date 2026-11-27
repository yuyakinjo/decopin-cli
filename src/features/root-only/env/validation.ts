/**
 * 環境変数の検証。起動時に一度だけ行う。
 *
 * argv と同じく「文字列で届く → 型に直す → 検証する」の順。
 * 失敗は `kind: 'env'` で exit 2 (設定の誤りは使い方の誤りに含める)。
 * argv と違い、失敗の文面に値は載せない (下の検証の箇所を参照)。
 */
import { coerce } from '../../../core/validation/coerce.ts';
import {
  toSchema,
  validateValue,
  withDefault,
} from '../../../core/validation/schema.ts';
import type { EnvSpec } from './spec.ts';

export type EnvResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; issues: string[] };

/**
 * 環境変数を宣言に照らして検証する。
 * 空文字は「未設定」として扱う (`TOKEN=` は required なら足りないと報告する)
 */
export function validateEnv(
  spec: EnvSpec,
  env: Record<string, string | undefined>
): EnvResult {
  const issues: string[] = [];
  const value: Record<string, unknown> = {};

  for (const declared of spec.vars) {
    const raw = env[declared.name];
    const schema = declared.required
      ? toSchema(declared.type)
      : withDefault(toSchema(declared.type), declared.defaultValue);

    if (raw === undefined || raw === '') {
      if (declared.required) {
        issues.push(`Missing required environment variable: ${declared.name}`);
        continue;
      }
      const validated = validateValue(schema, undefined);
      if (validated.ok) value[declared.name] = validated.value;
      continue;
    }

    // 文面に**値を載せない**。環境変数は秘密 (トークン) でありうるのに、
    // この失敗は stderr・`--json`・MCP の応答 (ADR 33) に出る。打った本人が
    // 読む argv と違い、読むのは呼び出し元のモデルやログの閲覧者かもしれない。
    // だから言うのは変数名と、満たさなかった宣言だけ
    const coerced = coerce(declared.type, raw);
    if (!coerced.ok) {
      issues.push(`${declared.name}: ${coerced.expectation}`);
      continue;
    }
    const validated = validateValue(schema, coerced.value);
    if (!validated.ok) {
      issues.push(
        ...validated.expectations.map(
          (expectation) => `${declared.name}: ${expectation}`
        )
      );
      continue;
    }
    value[declared.name] = validated.value;
  }

  return issues.length === 0 ? { ok: true, value } : { ok: false, issues };
}
