/**
 * 非推奨にしたものが、期限を過ぎても残っていないか (ADR 20)。
 *
 * 「あとで消す」は忘れる。期限を過ぎたらこのテストが落ちるので、
 * 消すまで CI が通らない
 */
import { describe, expect, test } from 'bun:test';

import {
  checkDeprecations,
  deprecatedFileWarnings,
} from '../../src/core/build/checker.ts';
import {
  DEPRECATIONS,
  type Deprecation,
  overdue,
} from '../../src/core/deprecations.ts';

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
        kind: 'source',
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
      kind: 'source',
      what: 'Type.Date',
      since: '2026-08-29',
      removeAfter: '2027-08-29',
      migration: 'use <Type.Instant/>',
    },
    {
      // ファイル名の非推奨はソースの中身に出てこないので、ここでは拾わない
      kind: 'filename',
      what: 'command.tsx',
      since: '2026-09-02',
      removeAfter: '2027-09-02',
      migration: 'replace command.tsx with cmd.tsx',
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

  test('ファイル名の非推奨は中身の検索では拾わない', async () => {
    // command.tsx という文字列がソースに出てきても、それは使用ではない
    expect(await warn('// see app/hello/command.tsx')).toEqual([]);
  });
});

describe('deprecatedFileWarnings', () => {
  const found = [
    {
      file: 'app/hello/command.tsx',
      legacy: 'command.tsx',
      current: 'cmd.tsx',
    },
  ];

  test('旧名を使っていたら、期限と新しい名前を伝える', () => {
    const warnings = deprecatedFileWarnings(found);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toBe(
      'app/hello/command.tsx: command.tsx is deprecated and will be removed after 2027-09-02'
    );
    expect(warnings[0]?.hint).toContain('cmd.tsx');
  });

  test('拡張子が違っても同じ非推奨として扱う', () => {
    const warnings = deprecatedFileWarnings([
      { file: 'app/go/command.ts', legacy: 'command.ts', current: 'cmd.ts' },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('command.ts is deprecated');
  });

  test('旧名が無ければ何も言わない', () => {
    expect(deprecatedFileWarnings([])).toEqual([]);
  });

  test('登録されていない旧名は黙って飛ばす', () => {
    expect(
      deprecatedFileWarnings([
        { file: 'app/x/old.tsx', legacy: 'old.tsx', current: 'new.tsx' },
      ])
    ).toEqual([]);
  });
});
