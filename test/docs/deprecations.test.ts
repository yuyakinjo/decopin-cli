/**
 * 非推奨にしたものが、期限を過ぎても残っていないか (ADR 20)。
 *
 * 「あとで消す」は忘れる。期限を過ぎたらこのテストが落ちるので、
 * 消すまで CI が通らない
 */
import { describe, expect, test } from 'bun:test';

import { checkDeprecations } from '../../src/build/checker.ts';
import {
  DEPRECATIONS,
  type Deprecation,
  overdue,
} from '../../src/deprecations.ts';

describe('削除期限', () => {
  test('期限を過ぎたものが残っていない', () => {
    const today = Temporal.Now.plainDateISO('UTC');
    const late = overdue(today).map((d) => `${d.what} (期限 ${d.removeAfter})`);
    // 落ちたら、消す。期限を延ばすのは決め直しなので ADR 20 も書き換える
    expect(late).toEqual([]);
  });

  test('期限を過ぎれば拾う (当日はまだ残してよい)', () => {
    const one: Deprecation[] = [
      {
        what: 'x',
        since: '2026-08-29',
        removeAfter: '2027-08-29',
        migration: 'use y',
      },
    ];
    expect(overdue(Temporal.PlainDate.from('2027-08-29'), one)).toEqual([]);
    expect(overdue(Temporal.PlainDate.from('2027-08-30'), one)).toHaveLength(1);
  });

  test('期限は非推奨にした日のちょうど 1 年後', () => {
    for (const deprecation of DEPRECATIONS) {
      const since = Temporal.PlainDate.from(deprecation.since);
      expect(deprecation.removeAfter).toBe(since.add({ years: 1 }).toString());
    }
  });

  test('移行の手順が書いてある', () => {
    for (const deprecation of DEPRECATIONS) {
      expect(deprecation.migration.length).toBeGreaterThan(0);
      // 「非推奨です」だけでは移行できない。何を使うかを言う
      expect(deprecation.migration).toMatch(/use |replace |call /);
    }
  });
});

describe('checkDeprecations', () => {
  const sample: Deprecation[] = [
    {
      what: 'Type.Date',
      since: '2026-08-29',
      removeAfter: '2027-08-29',
      migration: 'use <Type.Instant/>',
    },
  ];

  async function warn(source: string): Promise<string[]> {
    const file = `${import.meta.dir}/../../node_modules/.tmp-deprecation.tsx`;
    await Bun.write(file, source);
    const warnings = await checkDeprecations([file], sample);
    return warnings.map((w) => `${w.message}\n${w.hint ?? ''}`);
  }

  test('使っていたら、期限と移行先を伝える', async () => {
    const messages = await warn('<Option><Type.Date /></Option>');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('removed after 2027-08-29');
    expect(messages[0]).toContain('use <Type.Instant/>');
  });

  test('使っていなければ何も言わない', async () => {
    expect(await warn('<Option><Type.PlainDate /></Option>')).toEqual([]);
  });

  test('読めないファイルは飛ばす', async () => {
    expect(await checkDeprecations(['/nope/missing.tsx'], sample)).toEqual([]);
  });
});
