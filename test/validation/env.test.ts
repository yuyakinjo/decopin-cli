import { describe, expect, test } from 'bun:test';

import type { EnvSpec } from '../../src/features/root-only/env/spec.ts';
import { validateEnv } from '../../src/features/root-only/env/validation.ts';

const spec: EnvSpec = {
  vars: [
    {
      name: 'LOG',
      required: false,
      defaultValue: 'info',
      type: { kind: 'enum', values: ['debug', 'info'] },
    },
    {
      name: 'RETRIES',
      required: false,
      defaultValue: 3,
      type: { kind: 'number', min: 0, max: 10, integer: true },
    },
    { name: 'TOKEN', required: true, type: { kind: 'string' } },
    { name: 'EXTRA', required: false, type: { kind: 'string' } },
  ],
};

function ok(env: Record<string, string | undefined>) {
  const result = validateEnv(spec, env);
  if (!result.ok) throw new Error(`unexpected failure: ${result.issues}`);
  return result.value;
}

function issues(env: Record<string, string | undefined>) {
  const result = validateEnv(spec, env);
  if (result.ok) throw new Error('unexpected success');
  return result.issues;
}

describe('validateEnv', () => {
  test('既定値が入り、文字列は型に直る', () => {
    expect(ok({ TOKEN: 'secret' })).toEqual({
      LOG: 'info',
      RETRIES: 3,
      TOKEN: 'secret',
      EXTRA: undefined,
    });
  });

  test('設定された値を検証して使う', () => {
    expect(ok({ TOKEN: 't', LOG: 'debug', RETRIES: '7' })).toMatchObject({
      LOG: 'debug',
      RETRIES: 7,
    });
  });

  test('必須の環境変数が無ければ理由を伝える', () => {
    expect(issues({})).toEqual([
      'Missing required environment variable: TOKEN',
    ]);
  });

  test('空文字は「未設定」として扱う', () => {
    expect(issues({ TOKEN: '' })).toEqual([
      'Missing required environment variable: TOKEN',
    ]);
  });

  test('数値に直せない値', () => {
    expect(issues({ TOKEN: 't', RETRIES: 'abc' })).toEqual([
      'RETRIES: expected a number, received "abc"',
    ]);
  });

  test('範囲の違反', () => {
    expect(issues({ TOKEN: 't', RETRIES: '99' })[0]).toContain('RETRIES:');
  });

  test('選択肢の外', () => {
    expect(issues({ TOKEN: 't', LOG: 'verbose' })[0]).toContain('LOG:');
  });

  test('誤りは全部集める', () => {
    expect(issues({ LOG: 'verbose', RETRIES: 'abc' })).toHaveLength(3);
  });
});
