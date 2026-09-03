/**
 * 契約: argv の書き方と解釈。
 *
 * この表がフレームワークの約束そのもの。仕様書に同じ表を置くと実装と
 * ずれるので、表はここにしか無い。
 */
import { describe, expect, test } from 'bun:test';

import type { ArgvSpec } from '../../src/features/conventions/argv/spec.ts';
import { validateArgv } from '../../src/features/conventions/argv/validation.ts';

/** 表の全行が使う宣言 */
const SPEC: ArgvSpec = {
  args: [
    {
      name: 'name',
      required: false,
      variadic: false,
      type: { kind: 'string' },
    },
  ],
  options: [
    {
      name: 'loud',
      alias: 'l',
      required: false,
      defaultValue: false,
      hidden: false,
      type: { kind: 'boolean' },
    },
    {
      name: 'verbose',
      alias: 'v',
      required: false,
      defaultValue: false,
      hidden: false,
      type: { kind: 'boolean' },
    },
    {
      name: 'count',
      alias: 'c',
      required: false,
      hidden: false,
      type: { kind: 'number' },
    },
    {
      name: 'tag',
      alias: 't',
      required: false,
      hidden: false,
      type: { kind: 'array', item: { kind: 'string' } },
    },
  ],
};

/** 期待値: 成功なら渡る値、失敗ならメッセージの一部 */
type Expectation =
  | { args?: Record<string, unknown>; options?: Record<string, unknown> }
  | { issue: string };

const MATRIX: [書き方: string, tokens: string[], expected: Expectation][] = [
  ['--name value', ['--count', '3'], { options: { count: 3 } }],
  ['--name=value', ['--count=3'], { options: { count: 3 } }],
  [
    '--name=-5 (負数は = 区切りで渡す)',
    ['--count=-5'],
    { options: { count: -5 } },
  ],
  ['-a value', ['-c', '3'], { options: { count: 3 } }],
  ['-a=value', ['-c=3'], { options: { count: 3 } }],
  ['--loud (存在 = true)', ['--loud'], { options: { loud: true } }],
  [
    '--loud false は「フラグ + 位置引数」',
    ['--loud', 'false'],
    { args: { name: 'false' }, options: { loud: true } },
  ],
  [
    '--loud=false (boolean に値を渡す唯一の形)',
    ['--loud=false'],
    {
      options: { loud: false },
    },
  ],
  [
    '--no-loud (boolean を false に)',
    ['--no-loud'],
    {
      options: { loud: false },
    },
  ],
  ['-l (alias)', ['-l'], { options: { loud: true } }],
  [
    '-lv (boolean の alias は束ねられる)',
    ['-lv'],
    {
      options: { loud: true, verbose: true },
    },
  ],
  [
    '-lc (値を取る alias が混ざる束ねは不可)',
    ['-lc', '3'],
    {
      issue: 'Unknown option: -lc',
    },
  ],
  [
    '-lz (未知の文字が混ざる束ねも不可)',
    ['-lz'],
    {
      issue: 'Unknown option: -lz',
    },
  ],
  [
    '--tag a --tag b (配列は繰り返しで受ける)',
    ['--tag', 'a', '--tag', 'b'],
    {
      options: { tag: ['a', 'b'] },
    },
  ],
  [
    '--tag a,b (カンマ区切りは解釈しない)',
    ['--tag', 'a,b'],
    {
      options: { tag: ['a,b'] },
    },
  ],
  [
    '-c 1 -c 2 (配列でない型の重複は誤り)',
    ['-c', '1', '-c', '2'],
    {
      issue: 'takes only one value',
    },
  ],
  [
    '-- 以降はすべて位置引数',
    ['--', '--loud'],
    {
      args: { name: '--loud' },
      options: { loud: false },
    },
  ],
  ['- 単独は位置引数 (標準入力を指す慣習)', ['-'], { args: { name: '-' } }],
  ['未宣言のオプション', ['--nope'], { issue: 'Unknown option: --nope' }],
  [
    'boolean 以外が値なしで終端',
    ['--count'],
    {
      issue: '--count requires a value',
    },
  ],
  [
    'オプションと位置引数は混在できる',
    ['--loud', 'alice'],
    {
      args: { name: 'alice' },
      options: { loud: true },
    },
  ],
];

describe('argv のパース規則', () => {
  for (const [label, tokens, expected] of MATRIX) {
    test(label, () => {
      const result = validateArgv(SPEC, tokens);
      if ('issue' in expected) {
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.issues.join('\n')).toContain(expected.issue);
        return;
      }
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      if (expected.args !== undefined) {
        expect(result.value.args).toMatchObject(expected.args);
      }
      if (expected.options !== undefined) {
        expect(result.value.options).toMatchObject(expected.options);
      }
    });
  }
});

describe('variadic の失敗', () => {
  const spec: ArgvSpec = {
    args: [
      {
        name: 'ports',
        required: true,
        variadic: true,
        type: { kind: 'number' },
      },
    ],
    options: [],
  };

  test('1 つでも変換できなければ、その値を名指しする', () => {
    const result = validateArgv(spec, ['80', 'eighty']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        'ports: expected a number, received "eighty"',
      ]);
    }
  });

  test('必須なのに 1 つも無ければ Missing required argument', () => {
    const result = validateArgv(spec, []);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toEqual(['Missing required argument: ports']);
  });
});
