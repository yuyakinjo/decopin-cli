/**
 * 契約: 入力源ごとの型変換。
 *
 * argv と env の値は**常に文字列**で届くので、検証の前に変換層を挟む。
 * stdin (JSON) は JSON.parse が型を持つので変換しない。
 * 同じ `Type.*` でも入力源で振る舞いが変わる、という約束の表。
 */
import { describe, expect, test } from 'bun:test';

import { rejectObjectFor } from '../../src/declaration/parse.ts';
import type { StdinSpec } from '../../src/declaration/spec.ts';
import type { TypeNode } from '../../src/declaration/type-node.ts';
import { readStdin } from '../../src/runtime/stdin-reader.ts';
import { validateEnv } from '../../src/validation/env.ts';
import { validateArgv } from '../../src/validation/validate.ts';

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

describe('Type.Date', () => {
  test('argv / env: ISO 8601 を Date へ変換する', () => {
    const result = fromArgv({ kind: 'date' }, ['--x', '2026-08-28']);
    expect(result.ok && result.value.options.x).toBeInstanceOf(Date);
    expect(fromEnv({ kind: 'date' }, '2026-08-28').ok).toBe(true);
  });

  test('argv: パースできなければ誤り', () => {
    const result = fromArgv({ kind: 'date' }, ['--x', 'nope']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain('expected a date');
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
