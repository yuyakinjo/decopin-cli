/**
 * バージョンの決め方 (CalVer `YYYY.MMdd.HHmm`、UTC)。
 *
 * 番号は上げる一方で戻せないので、形と決め方をここで固定する。
 */
import { describe, expect, test } from 'bun:test';

import { calver, isCalVer } from '../../scripts/next-version.ts';

describe('calver', () => {
  test('日付と時刻から決まる', () => {
    expect(calver(new Date('2026-08-28T14:30:00Z'))).toBe('2026.828.1430');
  });

  test('先頭ゼロを付けない (semver として不正になるため)', () => {
    expect(calver(new Date('2026-01-05T09:05:00Z'))).toBe('2026.105.905');
    expect(calver(new Date('2026-01-05T00:07:00Z'))).toBe('2026.105.7');
  });

  test('真夜中は 0', () => {
    expect(calver(new Date('2026-08-28T00:00:00Z'))).toBe('2026.828.0');
  });

  test('UTC で読む (手元と CI で番号がぶれないため)', () => {
    // 日本時間の 8/29 08:30 は UTC では 8/28 23:30
    expect(calver(new Date('2026-08-28T23:30:00Z'))).toBe('2026.828.2330');
  });

  test('時刻が進めば番号も必ず増える', () => {
    const moments = [
      '2026-01-05T00:00:00Z',
      '2026-01-05T09:05:00Z',
      '2026-01-05T14:30:00Z',
      '2026-01-31T23:59:00Z',
      '2026-02-01T00:00:00Z',
      '2026-12-25T12:00:00Z',
      '2027-01-01T00:00:00Z',
    ].map((iso) => calver(new Date(iso)));

    for (let index = 1; index < moments.length; index += 1) {
      expect(compare(moments[index] as string, moments[index - 1] as string)) //
        .toBeGreaterThan(0);
    }
  });
});

/** semver の比較 (数値として左から見る) */
function compare(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (a[index] as number) - (b[index] as number);
    if (diff !== 0) return diff;
  }
  return 0;
}

describe('形', () => {
  test('妥当な例', () => {
    for (const version of ['2026.828.1430', '2026.105.7', '2026.1231.2359']) {
      expect(isCalVer(version)).toBe(true);
    }
  });

  test('月日と時分の範囲を外れたものは弾く', () => {
    for (const version of [
      '2026.1328.0', // 13 月
      '2026.832.0', // 32 日
      '2026.828.2460', // 24 時
      '2026.828.1360', // 60 分
      '2026.0828.0', // 先頭ゼロ
      '2026.8.28.1430', // 4 つ組 (npm がプレリリースとして解釈する)
      '0.5.0', // semver に戻った
    ]) {
      expect(isCalVer(version)).toBe(false);
    }
  });

  test('いま宣言しているバージョンがこの形をしている', async () => {
    const manifest = (await Bun.file('package.json').json()) as {
      version: string;
    };
    expect(isCalVer(manifest.version)).toBe(true);
  });

  test('サンプルの version も同じ', async () => {
    const manifest = (await Bun.file('package.json').json()) as {
      version: string;
    };
    const sample = await Bun.file('app/version.tsx').text();
    expect(sample).toContain(`version="${manifest.version}"`);
  });
});
