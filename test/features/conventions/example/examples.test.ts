/**
 * `example/runtime.ts` の単体テスト。
 *
 * `decopin docs` が走らせる example.tsx を `loadExamples` が読み、
 * 実行できる形に整える部分を見る。宣言が無ければ何も走らせないこと、
 * 壊れた宣言はどこがどう壊れているかを添えて DeclarationError で止めることを確かめる。
 */
import { describe, expect, test } from 'bun:test';

import { DeclarationError } from '../../../../src/core/errors.ts';
import { loadExamples } from '../../../../src/features/conventions/example/runtime.ts';

function loader(value: unknown) {
  return async () => ({ default: value });
}

describe('loadExamples: 読める宣言', () => {
  test('example.tsx が無ければ空 (docs は何も走らせない)', async () => {
    expect(await loadExamples(undefined)).toEqual([]);
  });

  test('同期でも非同期でも、返した例をそのまま並べる', async () => {
    const examples = [
      { args: ['world'], description: '名前を渡す' },
      { args: ['--loud'] },
    ];
    expect(await loadExamples(loader(() => examples))).toEqual([
      { args: ['world'], description: '名前を渡す' },
      { args: ['--loud'], description: undefined },
    ]);
    expect(await loadExamples(loader(async () => examples))).toHaveLength(2);
  });

  test('args は写しを返す (呼び出し側が書き換えても宣言に響かない)', async () => {
    const args = ['a'];
    const [loaded] = await loadExamples(loader(() => [{ args }]));
    expect(loaded?.args).toEqual(['a']);
    expect(loaded?.args).not.toBe(args);
  });

  test('余計なフィールドは落とす', async () => {
    const [loaded] = await loadExamples(
      loader(() => [{ args: [], extra: true }])
    );
    expect(loaded).toEqual({ args: [], description: undefined });
  });
});

describe('loadExamples: 壊れた宣言', () => {
  const cases: [string, unknown, string][] = [
    [
      'default export が関数でない',
      [{ args: [] }],
      'example.tsx: must default-export a function that returns CommandExample[]',
    ],
    [
      '配列を返さない',
      () => ({ args: [] }),
      'example.tsx: the default export must return an array',
    ],
    [
      '要素がオブジェクトでない',
      () => [{ args: [] }, 'hello'],
      'example.tsx: example 2: must be an object like { args: [] }',
    ],
    [
      'args に文字列以外が混じる',
      () => [{ args: ['a', 1] }],
      'example.tsx: example 1: args must be an array of strings',
    ],
    [
      'args が無い',
      () => [{ description: 'x' }],
      'example.tsx: example 1: args must be an array of strings',
    ],
    [
      'description が文字列でない',
      () => [{ args: [], description: 42 }],
      'example.tsx: example 1: description must be a string',
    ],
  ];
  for (const [label, value, message] of cases) {
    test(label, async () => {
      const error = await loadExamples(loader(value)).catch((e) => e);
      expect(error).toBeInstanceOf(DeclarationError);
      expect((error as Error).message).toBe(message);
    });
  }

  test('where を渡すとメッセージの頭がそのファイルになる', async () => {
    await expect(
      loadExamples(
        loader(() => null),
        'app/hello/example.tsx'
      )
    ).rejects.toThrow('app/hello/example.tsx: the default export must return');
  });
});
