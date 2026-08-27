/**
 * valibot スキーマの内省 (ADR 9)。
 *
 * 実測で分かった通り `v.pipe(base, ...)` は base の浅いコピー + pipe 配列で、
 * **入れ子の pipe は平坦化されない**。1 段しか見ないと transform を取りこぼして
 * 誤った型を出すので、そこを重点的に固定する。
 */
import { describe, expect, test } from 'bun:test';

import * as v from 'valibot';

import {
  isAsyncSchema,
  isValibotSchema,
  schemaToTypeText,
} from '../../src/build/schema-introspect.ts';

function text(schema: unknown): string {
  return schemaToTypeText(schema).text;
}

function unsupported(schema: unknown) {
  return schemaToTypeText(schema).unsupported;
}

describe('基本の型', () => {
  test('primitive', () => {
    expect(text(v.string())).toBe('string');
    expect(text(v.number())).toBe('number');
    expect(text(v.boolean())).toBe('boolean');
  });

  test('date は Date', () => {
    expect(text(v.date())).toBe('Date');
  });

  test('literal', () => {
    expect(text(v.literal('x'))).toBe('"x"');
    expect(text(v.literal(42))).toBe('42');
    expect(text(v.literal(true))).toBe('true');
  });

  test('bigint の literal も出せる (JSON.stringify は例外を投げる)', () => {
    expect(text(v.literal(10n))).toBe('10n');
  });

  test('picklist は union', () => {
    expect(text(v.picklist(['a', 'b']))).toBe('"a" | "b"');
  });
});

describe('pipe (制約) は透過する', () => {
  test('validation は型を変えない', () => {
    expect(text(v.pipe(v.string(), v.minLength(1)))).toBe('string');
    expect(text(v.pipe(v.number(), v.integer(), v.minValue(0)))).toBe('number');
    expect(unsupported(v.pipe(v.string(), v.minLength(1)))).toEqual([]);
  });

  test('metadata も型を変えない', () => {
    expect(text(v.pipe(v.string(), v.description('note')))).toBe('string');
  });

  test('transform は unknown に落ちる', () => {
    const schema = v.pipe(v.string(), v.transform(Number));
    expect(text(schema)).toBe('unknown');
    expect(unsupported(schema)[0]?.node).toBe('transform');
  });

  test('入れ子の pipe に隠れた transform も見つける', () => {
    // 1 段だけ見ると type が 'string' なので誤って string を出してしまう
    const inner = v.pipe(v.string(), v.transform(Number));
    const outer = v.pipe(inner, v.minValue(0));
    expect(text(outer)).toBe('unknown');
    expect(unsupported(outer)[0]?.node).toBe('transform');
  });

  test('brand も型を変えるので unknown', () => {
    expect(text(v.pipe(v.string(), v.brand('Id')))).toBe('unknown');
  });
});

describe('合成', () => {
  test('array', () => {
    expect(text(v.array(v.string()))).toBe('string[]');
  });

  test('union を配列にするときは括弧を付ける', () => {
    expect(text(v.array(v.picklist(['a', 'b'])))).toBe('("a" | "b")[]');
    expect(text(v.array(v.union([v.string(), v.number()])))).toBe(
      '(string | number)[]'
    );
  });

  test('object のキーは optional / default で変わる', () => {
    expect(
      text(
        v.object({
          id: v.number(),
          tag: v.optional(v.string()),
          level: v.optional(v.number(), 1),
          exact: v.exactOptional(v.string()),
        })
      )
    ).toBe('{ id: number; tag?: string; level: number; exact?: string }');
  });

  test('nullable は省略できないので ? を付けない', () => {
    expect(text(v.object({ a: v.nullable(v.string()) }))).toBe(
      '{ a: string | null }'
    );
  });

  test('nullish は省略もできる', () => {
    expect(text(v.object({ a: v.nullish(v.string()) }))).toBe(
      '{ a?: string | null }'
    );
  });

  test('識別子にできないキーは引用符で囲む', () => {
    expect(
      text(v.object({ 'content-type': v.string(), '2x': v.number() }))
    ).toBe('{ "content-type": string; "2x": number }');
  });

  test('union', () => {
    expect(text(v.union([v.string(), v.number()]))).toBe('string | number');
  });

  test('トップレベルの optional は | undefined', () => {
    expect(text(v.optional(v.string()))).toBe('string | undefined');
  });

  test('3 階層', () => {
    expect(
      text(v.array(v.object({ items: v.array(v.object({ id: v.number() })) })))
    ).toBe('{ items: { id: number }[] }[]');
  });
});

describe('unknown へのフォールバック', () => {
  test('未対応のノードは種別を報告する', () => {
    for (const [schema, node] of [
      [v.record(v.string(), v.number()), 'record'],
      [v.tuple([v.string()]), 'tuple'],
      [v.custom(() => true), 'custom'],
      [v.lazy(() => v.string()), 'lazy'],
      [v.intersect([v.object({ a: v.string() })]), 'intersect'],
    ] as const) {
      expect(text(schema)).toBe('unknown');
      expect(unsupported(schema)[0]?.node).toBe(node);
    }
  });

  test('未対応は該当箇所だけが unknown になる', () => {
    const schema = v.object({
      ok: v.string(),
      bad: v.record(v.string(), v.number()),
    });
    expect(text(schema)).toBe('{ ok: string; bad: unknown }');
    expect(unsupported(schema)[0]?.path).toBe('$.bad');
  });

  test('配列の要素なら位置が分かる', () => {
    const schema = v.array(v.custom(() => true));
    expect(text(schema)).toBe('unknown[]');
    expect(unsupported(schema)[0]?.path).toBe('$[]');
  });

  test('lazy の getter は呼ばない (副作用と循環を避ける)', () => {
    let called = false;
    schemaToTypeText(
      v.lazy(() => {
        called = true;
        return v.string();
      })
    );
    expect(called).toBe(false);
  });

  test('循環していても止まる', () => {
    const node: v.GenericSchema = v.object({
      children: v.array(v.lazy(() => node)),
    });
    expect(text(node)).toBe('{ children: unknown[] }');
  });

  test('深すぎる入れ子は打ち切る', () => {
    let schema: v.GenericSchema = v.string();
    for (let index = 0; index < 30; index += 1) schema = v.array(schema);
    const result = schemaToTypeText(schema);
    expect(result.text).toContain('unknown');
    expect(result.unsupported[0]?.detail).toBe('depth limit exceeded');
  });

  test('スキーマでない値', () => {
    for (const value of [{}, null, 42, () => {}, 'string']) {
      const result = schemaToTypeText(value);
      expect(result.text).toBe('unknown');
      expect(result.unsupported[0]?.detail).toBe('not a valibot schema');
    }
  });
});

describe('スキーマの判定', () => {
  test('isValibotSchema', () => {
    expect(isValibotSchema(v.string())).toBe(true);
    expect(isValibotSchema(v.pipe(v.string(), v.minLength(1)))).toBe(true);
    expect(isValibotSchema({ kind: 'schema', type: 'string' })).toBe(false);
    expect(isValibotSchema(null)).toBe(false);
  });

  test('isAsyncSchema', () => {
    expect(isAsyncSchema(v.string())).toBe(false);
    expect(
      isAsyncSchema(
        v.pipeAsync(
          v.string(),
          v.checkAsync(async () => true)
        )
      )
    ).toBe(true);
  });
});
