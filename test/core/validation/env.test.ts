import { describe, expect, test } from 'bun:test';

import type { TypeNode } from '../../../src/core/types/type-node.ts';
import type { EnvSpec } from '../../../src/features/root-only/env/spec.ts';
import { validateEnv } from '../../../src/features/root-only/env/validation.ts';

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
      'RETRIES: expected a number',
    ]);
  });

  test('範囲の違反', () => {
    expect(issues({ TOKEN: 't', RETRIES: '99' })).toEqual([
      'RETRIES: Invalid value: Expected <=10',
    ]);
  });

  test('選択肢の外', () => {
    expect(issues({ TOKEN: 't', LOG: 'verbose' })).toEqual([
      'LOG: Invalid type: Expected ("debug" | "info")',
    ]);
  });

  test('誤りは全部集める', () => {
    expect(issues({ LOG: 'verbose', RETRIES: 'abc' })).toHaveLength(3);
  });
});

/**
 * 環境変数は秘密でありうる。検証に失敗したときの文面は stderr・`--json`・
 * MCP の応答に出るので、**値そのものは載せない** (変数名と、満たさなかった
 * 宣言だけを言う)。型変換で落ちる経路と、制約で落ちる経路の両方を見る
 */
describe('失敗の文面に値を載せない', () => {
  const SECRET = 'synthetic-secret-9F3K';
  const cases: [string, TypeNode, string][] = [
    ['number に直せない', { kind: 'number' }, 'V: expected a number'],
    [
      'boolean に直せない',
      { kind: 'boolean' },
      'V: expected a boolean (true or false)',
    ],
    ['date に直せない', { kind: 'date' }, 'V: expected a date'],
    [
      'instant に直せない',
      { kind: 'instant' },
      'V: expected an instant like 2026-08-28T14:30:00Z',
    ],
    [
      'plainDate に直せない',
      { kind: 'plainDate' },
      'V: expected a date like 2026-08-28',
    ],
    [
      'oneOf のどれにも直せない',
      { kind: 'oneOf', options: [{ kind: 'number' }, { kind: 'boolean' }] },
      'V: expected a number / expected a boolean (true or false)',
    ],
    [
      'pattern に合わない',
      { kind: 'string', pattern: '^expected-prefix-' },
      'V: Invalid format: Expected /^expected-prefix-/',
    ],
    [
      '長さが足りない / 超える',
      { kind: 'string', maxLength: 4 },
      'V: Invalid length: Expected <=4',
    ],
    ['email でない', { kind: 'string', email: true }, 'V: Invalid email'],
    ['url でない', { kind: 'string', url: true }, 'V: Invalid URL'],
    [
      '選択肢の外',
      { kind: 'enum', values: ['a', 'b'] },
      'V: Invalid type: Expected ("a" | "b")',
    ],
    [
      'oneOf のどの制約も満たさない',
      {
        kind: 'oneOf',
        options: [
          { kind: 'string', maxLength: 1 },
          { kind: 'enum', values: ['a'] },
        ],
      },
      // valibot は型が合った候補 (string) の違反を返す
      'V: Invalid length: Expected <=1',
    ],
    [
      'Type.Custom の検証に落ちる (自分で書いた文面はそのまま)',
      {
        kind: 'custom',
        coerceAs: 'string',
        validate: () => false,
        message: 'must be a token issued by the console',
      },
      'V: must be a token issued by the console',
    ],
    [
      'Type.Custom に文面が無い',
      { kind: 'custom', coerceAs: 'none', validate: () => false },
      'V: Invalid value',
    ],
  ];

  for (const [name, type, expected] of cases) {
    test(name, () => {
      const result = validateEnv(
        { vars: [{ name: 'V', required: true, type }] },
        { V: SECRET }
      );
      if (result.ok) throw new Error('unexpected success');
      expect(result.issues).toEqual([expected]);
      expect(result.issues.join('\n')).not.toContain(SECRET);
    });
  }

  test('数値の範囲違反も、受け取った数を言わない', () => {
    const result = validateEnv(
      {
        vars: [
          {
            name: 'PIN',
            required: true,
            type: { kind: 'number', min: 100000, integer: true },
          },
        ],
      },
      { PIN: '4.2' }
    );
    if (result.ok) throw new Error('unexpected success');
    expect(result.issues.join('\n')).not.toContain('4.2');
  });
});
