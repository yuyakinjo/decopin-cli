import { describe, expect, test } from 'bun:test';

import type { ArgvSpec } from '../../src/features/conventions/argv/spec.ts';
import { validateArgv } from '../../src/features/conventions/argv/validation.ts';

const spec: ArgvSpec = {
  args: [
    {
      name: 'name',
      required: false,
      defaultValue: 'world',
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
      name: 'times',
      alias: 't',
      required: false,
      defaultValue: 1,
      hidden: false,
      type: { kind: 'number', min: 1, max: 5, integer: true },
    },
    {
      name: 'style',
      required: false,
      defaultValue: 'plain',
      hidden: false,
      type: { kind: 'enum', values: ['plain', 'bold'] },
    },
  ],
};

function ok(tokens: string[]) {
  const result = validateArgv(spec, tokens);
  if (!result.ok) throw new Error(`unexpected failure: ${result.issues}`);
  return result.value;
}

function issues(tokens: string[]) {
  const result = validateArgv(spec, tokens);
  if (result.ok) throw new Error('unexpected success');
  return result.issues;
}

describe('validateArgv', () => {
  test('省略時は既定値が入る', () => {
    expect(ok([])).toEqual({
      args: { name: 'world' },
      options: { loud: false, times: 1, style: 'plain' },
    });
  });

  test('位置引数とオプションを検証して型に直す', () => {
    expect(ok(['alice', '-l', '-t', '3'])).toEqual({
      args: { name: 'alice' },
      options: { loud: true, times: 3, style: 'plain' },
    });
  });

  test('数値に直せない値は何を渡すべきか伝える', () => {
    expect(issues(['--times', 'abc'])).toEqual([
      '--times: expected a number, received "abc"',
    ]);
  });

  test('範囲の違反は valibot のメッセージを添える', () => {
    expect(issues(['--times', '9'])[0]).toContain('--times:');
    expect(issues(['--times', '9'])[0]).toContain('Expected <=5');
  });

  test('整数でない値を弾く', () => {
    expect(issues(['--times', '1.5'])[0]).toContain('--times:');
  });

  test('enum の外の値を弾く', () => {
    expect(issues(['--style', 'fancy'])[0]).toContain('--style:');
  });

  test('未知のオプション', () => {
    expect(issues(['--nope'])).toEqual(['Unknown option: --nope']);
  });

  test('余分な位置引数', () => {
    expect(issues(['a', 'b'])).toEqual(['Unexpected argument: b']);
  });

  test('誤りは 1 回でまとめて返す', () => {
    expect(issues(['--nope', '--times', 'abc']).length).toBe(2);
  });

  test('必須の指定漏れ', () => {
    const required: ArgvSpec = {
      args: [
        {
          name: 'target',
          required: true,
          variadic: false,
          type: { kind: 'string' },
        },
      ],
      options: [
        {
          name: 'token',
          required: true,
          hidden: false,
          type: { kind: 'string' },
        },
      ],
    };
    const result = validateArgv(required, []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      'Missing required option: --token',
      'Missing required argument: target',
    ]);
  });

  test('variadic は残りの位置引数を配列で受け取る', () => {
    const variadic: ArgvSpec = {
      args: [
        {
          name: 'files',
          required: true,
          variadic: true,
          type: { kind: 'string' },
        },
      ],
      options: [],
    };
    const result = validateArgv(variadic, ['a', 'b', 'c']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.args).toEqual({ files: ['a', 'b', 'c'] });
  });

  test('繰り返し指定は配列になる', () => {
    const repeated: ArgvSpec = {
      args: [],
      options: [
        {
          name: 'tag',
          required: false,
          hidden: false,
          type: { kind: 'array', item: { kind: 'string' } },
        },
      ],
    };
    const result = validateArgv(repeated, ['--tag', 'x', '--tag', 'y']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.options).toEqual({ tag: ['x', 'y'] });
  });

  test('配列でない型の繰り返しは exit 2 (最後勝ちにしない)', () => {
    // 意図しない上書きに気づけないので、誤りとして報告する (test/contract/argv-parsing.test.ts)
    expect(issues(['-t', '2', '-t', '4'])).toEqual([
      '--times: was given 2 times, but takes only one value',
    ]);
  });
});
