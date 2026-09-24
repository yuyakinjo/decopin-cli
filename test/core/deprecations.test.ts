/**
 * `overdue()` の単体の振る舞い (ADR 20)。
 *
 * 実際の期限切れの見張りは test/docs/deprecations.test.ts が受け持つ。
 * ここでは渡した一覧をどう絞るか (順序、既定の一覧、境界) だけを見る
 */
import { describe, expect, test } from 'bun:test';

import {
  DEPRECATIONS,
  type Deprecation,
  overdue,
} from '../../src/core/deprecations.ts';

function item(what: string, removeAfter: string): Deprecation {
  return {
    kind: 'source',
    what,
    since: Temporal.PlainDate.from(removeAfter)
      .subtract({ years: 1 })
      .toString(),
    removeAfter,
    migration: `use ${what}2`,
  };
}

describe('overdue', () => {
  const list = [
    item('a', '2027-01-10'),
    item('b', '2027-03-01'),
    item('c', '2027-01-31'),
  ];

  test('期限を過ぎたものだけを、一覧の順のまま返す', () => {
    const today = Temporal.PlainDate.from('2027-02-01');
    expect(overdue(today, list).map((d) => d.what)).toEqual(['a', 'c']);
  });

  test('月や年をまたいでも日付として比べる (文字列比較ではない)', () => {
    // 2027-12-31 の翌日は 2028-01-01。日付として比べれば過ぎている
    const yearEnd = [item('y', '2027-12-31')];
    expect(overdue(Temporal.PlainDate.from('2028-01-01'), yearEnd)).toEqual(
      yearEnd
    );
    expect(overdue(Temporal.PlainDate.from('2027-12-31'), yearEnd)).toEqual([]);
  });

  test('空の一覧なら何も返さない', () => {
    expect(overdue(Temporal.PlainDate.from('2100-01-01'), [])).toEqual([]);
  });

  test('一覧を省くと DEPRECATIONS を見る', () => {
    // 最初の非推奨より前なら何も無く、十分先なら全部が期限切れ
    expect(overdue(Temporal.PlainDate.from('2026-01-01'))).toEqual([]);
    expect(overdue(Temporal.PlainDate.from('2100-01-01'))).toEqual([
      ...DEPRECATIONS,
    ]);
  });

  test('返すのは元の要素そのもの (写しではない)', () => {
    const [found] = overdue(Temporal.PlainDate.from('2027-01-11'), list);
    expect(found).toBe(list[0]);
  });
});

describe('DEPRECATIONS', () => {
  test('探し方は source か filename のどちらか', () => {
    for (const d of DEPRECATIONS) {
      expect(['source', 'filename']).toContain(d.kind);
    }
  });

  test('日付はどれも Temporal.PlainDate として読める', () => {
    for (const d of DEPRECATIONS) {
      expect(Temporal.PlainDate.from(d.since).toString()).toBe(d.since);
      expect(Temporal.PlainDate.from(d.removeAfter).toString()).toBe(
        d.removeAfter
      );
    }
  });
});
