import { describe, expect, test } from 'bun:test';

import type { ArgvSpec } from '../../src/features/conventions/argv/spec.ts';
import { tokenize } from '../../src/features/conventions/argv/tokens.ts';

const spec: ArgvSpec = {
  args: [],
  options: [
    {
      name: 'loud',
      alias: 'l',
      required: false,
      hidden: false,
      type: { kind: 'boolean' },
    },
    {
      name: 'times',
      alias: 't',
      required: false,
      hidden: false,
      type: { kind: 'number' },
    },
    {
      name: 'tag',
      required: false,
      hidden: false,
      type: { kind: 'array', item: { kind: 'string' } },
    },
  ],
};

function run(tokens: string[]) {
  const result = tokenize(tokens, spec);
  return {
    positionals: result.positionals,
    options: Object.fromEntries(result.options),
    unknownOptions: result.unknownOptions,
    errors: result.errors,
  };
}

describe('tokenize', () => {
  test('位置引数をそのまま集める', () => {
    expect(run(['a', 'b']).positionals).toEqual(['a', 'b']);
  });

  test('--name value と --name=value の両方', () => {
    expect(run(['--times', '3']).options).toEqual({ times: ['3'] });
    expect(run(['--times=3']).options).toEqual({ times: ['3'] });
  });

  test('短縮形も同じ扱い', () => {
    expect(run(['-t', '3']).options).toEqual({ times: ['3'] });
    expect(run(['-t=3']).options).toEqual({ times: ['3'] });
  });

  test('boolean は値を取らない', () => {
    const result = run(['--loud', 'positional']);
    expect(result.options).toEqual({ loud: [true] });
    expect(result.positionals).toEqual(['positional']);
  });

  test('--no-<name> で boolean を false にする', () => {
    expect(run(['--no-loud']).options).toEqual({ loud: ['false'] });
  });

  test('繰り返しは順番に集める', () => {
    expect(run(['--tag', 'x', '--tag', 'y']).options).toEqual({
      tag: ['x', 'y'],
    });
  });

  test('-- 以降はすべて位置引数', () => {
    const result = run(['--loud', '--', '--times', 'x']);
    expect(result.positionals).toEqual(['--times', 'x']);
    expect(result.options).toEqual({ loud: [true] });
  });

  test('単独の - は位置引数 (標準入力を指す慣習)', () => {
    expect(run(['-']).positionals).toEqual(['-']);
  });

  test('宣言されていないオプションを覚える', () => {
    expect(run(['--nope']).unknownOptions).toEqual(['--nope']);
    expect(run(['-z']).unknownOptions).toEqual(['-z']);
  });

  test('boolean の alias は束ねられる', () => {
    const spread: ArgvSpec = {
      args: [],
      options: [
        ...spec.options,
        {
          name: 'verbose',
          alias: 'v',
          required: false,
          hidden: false,
          type: { kind: 'boolean' },
        },
      ],
    };
    const result = tokenize(['-lv'], spread);
    expect(Object.fromEntries(result.options)).toEqual({
      loud: [true],
      verbose: [true],
    });
    expect(result.unknownOptions).toEqual([]);
  });

  test('値を取る alias が混ざる束ねは解釈しない', () => {
    // -lt だと t に値が付くのか曖昧なので、束ね全体を未知として扱う
    expect(run(['-lt']).unknownOptions).toEqual(['-lt']);
  });

  test('未知の文字が混ざる束ねも解釈しない', () => {
    expect(run(['-lz']).unknownOptions).toEqual(['-lz']);
  });

  test('束ねに = を付けた形は解釈しない', () => {
    expect(run(['-lv=1']).unknownOptions).toEqual(['-lv']);
  });

  test('値が足りなければ誤りとして報告する', () => {
    expect(run(['--times']).errors).toEqual(['--times requires a value']);
  });
});
