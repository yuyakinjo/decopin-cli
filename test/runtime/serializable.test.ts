/**
 * `--json` に出せるかの検査 (ADR 27)。
 *
 * `JSON.stringify` が黙って壊すものを、出す前に**経路つき**で止める。
 * ここが表で、実際に止めるのは run.tsx
 */
import { describe, expect, test } from 'bun:test';

import { findNotSerializable } from '../../src/runtime/serializable.ts';

/** 問題なしと判断されるべきもの */
const fine: [string, unknown][] = [
  ['文字列', { a: 'x' }],
  ['数', { a: 1, b: -0.5 }],
  ['真偽', { a: true }],
  ['null', { a: null }],
  ['入れ子', { a: { b: { c: [1, 'two', false] } } }],
  ['空の配列と object', { a: [], b: {} }],
  ['プロトタイプなしの object', Object.assign(Object.create(null), { a: 1 })],
  ['トップレベルの配列', [1, 2, 3]],
  ['トップレベルの文字列', 'plain'],
];

/** 黙って壊れるので止めるべきもの */
const rejected: [string, unknown, string][] = [
  ['関数', { fn: () => 1 }, 'data.fn'],
  ['Map', { m: new Map() }, 'data.m'],
  ['Set', { s: new Set() }, 'data.s'],
  ['Date', { when: new Date() }, 'data.when'],
  ['クラスのインスタンス', { it: new (class Thing {})() }, 'data.it'],
  ['bigint', { big: 1n }, 'data.big'],
  ['NaN', { n: Number.NaN }, 'data.n'],
  ['Infinity', { n: Number.POSITIVE_INFINITY }, 'data.n'],
  ['undefined', { u: undefined }, 'data.u'],
  ['symbol', { s: Symbol('x') }, 'data.s'],
  ['配列の中', { list: [1, () => 2] }, 'data.list[1]'],
  ['深い入れ子', { a: { b: { c: new Map() } } }, 'data.a.b.c'],
];

describe('findNotSerializable', () => {
  for (const [label, value] of fine) {
    test(`通す: ${label}`, () => {
      expect(findNotSerializable(value)).toBeUndefined();
    });
  }

  for (const [label, value, path] of rejected) {
    test(`止める: ${label}`, () => {
      const found = findNotSerializable(value);
      expect(found?.path).toBe(path);
      // 理由は利用者が読むので、空にしない
      expect(found?.reason.length ?? 0).toBeGreaterThan(0);
    });
  }

  test('循環は経路を出して止める', () => {
    const loop: Record<string, unknown> = { name: 'x' };
    loop.self = loop;
    expect(findNotSerializable(loop)).toEqual({
      path: 'data.self',
      reason: 'circular reference',
    });
  });

  test('toJSON があるものは「型と食い違う」と言う', () => {
    const found = findNotSerializable({ when: new Date() });
    expect(found?.reason).toContain('its type does not mention');
  });

  test('toJSON が無いものは「{} になる」と言う', () => {
    const found = findNotSerializable({ m: new Map() });
    expect(found?.reason).toContain('becomes {}');
  });

  test('最初の 1 件で止める (直す順が上から決まるため)', () => {
    const found = findNotSerializable({ a: () => 1, b: new Map() });
    expect(found?.path).toBe('data.a');
  });
});
