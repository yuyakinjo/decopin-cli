/**
 * 契約: 入力源ごとの型変換。
 *
 * argv と env の値は**常に文字列**で届くので、検証の前に変換層を挟む。
 * stdin (JSON) は JSON.parse が型を持つので変換しない。
 * 同じ `Type.*` でも入力源で振る舞いが変わる、という約束の表。
 */
import { describe, expect, test } from 'bun:test';

import type { TypeNode } from '../../src/core/types/type-node.ts';
import { validateArgv } from '../../src/features/conventions/argv/validation.ts';
import { readStdin } from '../../src/features/conventions/stdin/runtime.ts';
import type { StdinSpec } from '../../src/features/conventions/stdin/spec.ts';
import { rejectObjectFor } from '../../src/features/parse-helpers.ts';
import { validateEnv } from '../../src/features/root-only/env/validation.ts';

/** argv のオプション 1 つとして検証する */
function fromArgv(type: TypeNode, tokens: string[]) {
  return validateArgv(
    {
      args: [],
      options: [{ name: 'x', required: false, hidden: false, type }],
    },
    tokens
  );
}

/** env の変数 1 つとして検証する */
function fromEnv(type: TypeNode, value: string) {
  return validateEnv(
    { vars: [{ name: 'X', required: true, type }] },
    { X: value }
  );
}

/** stdin (JSON) として検証する */
function fromStdin(type: TypeNode, json: string) {
  const spec: StdinSpec = {
    mode: 'json',
    required: true,
    trim: false,
    type,
  };
  return readStdin(spec, { isTTY: false, read: async () => json });
}

describe('Type.String', () => {
  test('argv: そのまま', () => {
    const result = fromArgv({ kind: 'string' }, ['--x', 'abc']);
    expect(result.ok && result.value.options.x).toBe('abc');
  });

  test('env: そのまま', () => {
    const result = fromEnv({ kind: 'string' }, 'abc');
    expect(result.ok && result.value.X).toBe('abc');
  });

  test('stdin: string であることを検証する', async () => {
    expect(await fromStdin({ kind: 'string' }, '"abc"')).toBe('abc');
    await expect(fromStdin({ kind: 'string' }, '42')).rejects.toThrow(
      /does not match/
    );
  });
});

describe('Type.Number', () => {
  test('argv: Number() で変換する', () => {
    const result = fromArgv({ kind: 'number' }, ['--x', '3']);
    expect(result.ok && result.value.options.x).toBe(3);
  });

  test('argv: NaN と空文字は誤り', () => {
    for (const raw of ['abc', '']) {
      const result = fromArgv({ kind: 'number' }, ['--x', raw]);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.issues[0]).toContain('expected a number');
    }
  });

  test('env: Number() で変換する', () => {
    expect(fromEnv({ kind: 'number' }, '7')).toMatchObject({
      ok: true,
      value: { X: 7 },
    });
    expect(fromEnv({ kind: 'number' }, 'abc').ok).toBe(false);
  });

  test('stdin: number であることを検証する (変換はしない)', async () => {
    expect(await fromStdin({ kind: 'number' }, '3')).toBe(3);
    await expect(fromStdin({ kind: 'number' }, '"3"')).rejects.toThrow(
      /does not match/
    );
  });

  test('制約は変換後の値に効く', () => {
    const type: TypeNode = { kind: 'number', min: 1, max: 5 };
    expect(fromArgv(type, ['--x', '3']).ok).toBe(true);
    expect(fromArgv(type, ['--x', '9']).ok).toBe(false);
  });
});

describe('Type.Boolean', () => {
  test('argv: 存在 = true', () => {
    const result = fromArgv({ kind: 'boolean' }, ['--x']);
    expect(result.ok && result.value.options.x).toBe(true);
  });

  test('argv: 値を解釈するのは = 付きのときだけ', () => {
    expect(fromArgv({ kind: 'boolean' }, ['--x=false'])).toMatchObject({
      ok: true,
      value: { options: { x: false } },
    });
  });

  test('env: true / false / 1 / 0 を変換する', () => {
    for (const [raw, expected] of [
      ['true', true],
      ['1', true],
      ['false', false],
      ['0', false],
    ] as const) {
      expect(fromEnv({ kind: 'boolean' }, raw)).toMatchObject({
        ok: true,
        value: { X: expected },
      });
    }
  });

  test('env: 知らない綴りは誤り', () => {
    expect(fromEnv({ kind: 'boolean' }, 'yes').ok).toBe(false);
  });

  test('stdin: boolean であることを検証する', async () => {
    expect(await fromStdin({ kind: 'boolean' }, 'true')).toBe(true);
    await expect(fromStdin({ kind: 'boolean' }, '"true"')).rejects.toThrow(
      /does not match/
    );
  });
});

describe('Type.Enum', () => {
  const type: TypeNode = { kind: 'enum', values: ['a', 'b'] };

  test('argv / env: 文字列のまま values と比べる', () => {
    expect(fromArgv(type, ['--x', 'a']).ok).toBe(true);
    expect(fromArgv(type, ['--x', 'c']).ok).toBe(false);
    expect(fromEnv(type, 'b').ok).toBe(true);
    expect(fromEnv(type, 'c').ok).toBe(false);
  });

  test('stdin: 同じ', async () => {
    expect(await fromStdin(type, '"a"')).toBe('a');
    await expect(fromStdin(type, '"c"')).rejects.toThrow(/does not match/);
  });
});

describe('Type.Instant / Type.PlainDate', () => {
  // Temporal には Date のように両方の書き方を飲み込む型が無いので、
  // 「瞬間」と「暦日」で受け付ける文字列が違う。その境目をここで固定する
  const accepts: [string, string, boolean][] = [
    ['instant', '2026-08-28T14:30:00Z', true],
    ['instant', '2026-08-28T14:30:00+09:00', true],
    ['instant', '2026-08-28', false], // 時間帯が無いので一点に定まらない
    ['plainDate', '2026-08-28', true],
    ['plainDate', '2026-08-28T14:30:00', true], // 時刻は落ちる
    ['plainDate', '2026-08-28T14:30:00Z', false], // 暦日に時間帯は付かない
    ['instant', 'nope', false],
    ['plainDate', 'nope', false],
  ];

  for (const [kind, input, ok] of accepts) {
    test(`${kind}: ${JSON.stringify(input)} を ${ok ? '受け取る' : '弾く'}`, () => {
      const type = { kind } as TypeNode;
      expect(fromArgv(type, ['--x', input]).ok).toBe(ok);
      expect(fromEnv(type, input).ok).toBe(ok);
    });
  }

  test('Temporal の値になる (Date ではない)', () => {
    const instant = fromArgv({ kind: 'instant' }, [
      '--x',
      '2026-08-28T14:30:00Z',
    ]);
    expect(instant.ok && instant.value.options.x).toBeInstanceOf(
      Temporal.Instant
    );

    const plain = fromArgv({ kind: 'plainDate' }, ['--x', '2026-08-28']);
    expect(plain.ok && plain.value.options.x).toBeInstanceOf(
      Temporal.PlainDate
    );
  });

  test('弾いたときは何を期待したかを言う', () => {
    const result = fromArgv({ kind: 'plainDate' }, ['--x', 'nope']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain('a date like 2026-08-28');
  });
});

describe('Type.Array', () => {
  const type: TypeNode = { kind: 'array', item: { kind: 'number' } };

  test('argv: 繰り返しから配列を作り、要素ごとに変換する', () => {
    const result = fromArgv(type, ['--x', '1', '--x', '2']);
    expect(result.ok && result.value.options.x).toEqual([1, 2]);
  });

  test('argv: 要素の変換に失敗したら誤り', () => {
    expect(fromArgv(type, ['--x', 'abc']).ok).toBe(false);
  });

  test('stdin: JSON 配列を検証する', async () => {
    expect(await fromStdin(type, '[1,2]')).toEqual([1, 2]);
    await expect(fromStdin(type, '["1"]')).rejects.toThrow(/does not match/);
  });
});

describe('Type.Object', () => {
  const type: TypeNode = {
    kind: 'object',
    fields: [{ name: 'id', required: true, type: { kind: 'number' } }],
  };

  test('stdin: JSON オブジェクトを検証する', async () => {
    expect(await fromStdin(type, '{"id":1}')).toEqual({ id: 1 });
    await expect(fromStdin(type, '{"id":"x"}')).rejects.toThrow(
      /does not match/
    );
  });

  test('argv / env では宣言そのものが通らない (ビルド時に弾く)', () => {
    // 値が常に文字列で届く入力源で構造を宣言しても意味が取れないため
    for (const source of ['argv', 'env'] as const) {
      expect(() => rejectObjectFor(source, type)).toThrow(
        /<Type.Object> cannot be used for/
      );
    }
  });
});
