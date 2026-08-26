import { describe, expect, test } from 'bun:test';

import type { ArgvSpec } from '../../src/declaration/spec.ts';
import { tokenize } from '../../src/validation/tokens.ts';

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

  test('短縮形の結合は解釈しない (v1)', () => {
    expect(run(['-lt']).unknownOptions).toEqual(['-lt']);
  });

  test('値が足りなければ誤りとして報告する', () => {
    expect(run(['--times']).errors).toEqual(['--times requires a value']);
  });
});
