/**
 * バージョンの決め方 (CalVer `YYYY.MM.PATCH`)。
 *
 * 番号は上げる一方で戻せないので、形と採番をここで固定する。
 */
import { describe, expect, test } from 'bun:test';

import { CALVER, nextVersion } from '../../scripts/next-version.ts';

const AUGUST = new Date('2026-08-28T00:00:00Z');

describe('nextVersion', () => {
  test('その年月がまだ無ければ 0 から', () => {
    expect(nextVersion([], AUGUST)).toBe('2026.8.0');
  });

  test('同じ年月に出ていれば次の番号', () => {
    expect(nextVersion(['2026.8.0'], AUGUST)).toBe('2026.8.1');
    expect(nextVersion(['2026.8.0', '2026.8.1'], AUGUST)).toBe('2026.8.2');
  });

  test('番号の大小で見る (並び順には頼らない)', () => {
    expect(nextVersion(['2026.8.10', '2026.8.2'], AUGUST)).toBe('2026.8.11');
  });

  test('別の年月は数えない', () => {
    expect(nextVersion(['2026.7.9', '2025.8.4'], AUGUST)).toBe('2026.8.0');
  });

  test('CalVer でない過去のバージョンは無視する', () => {
    // semver で公開していた頃のものが残っていても引きずられない
    expect(nextVersion(['0.5.0', '1.2.3'], AUGUST)).toBe('2026.8.0');
  });

  test('年が変わっても自然に並ぶ', () => {
    expect(nextVersion(['2026.12.3'], new Date('2027-01-05T00:00:00Z'))).toBe(
      '2027.1.0'
    );
  });
});

describe('形', () => {
  test('先頭ゼロを付けない (semver として不正になるため)', () => {
    expect(nextVersion([], new Date('2026-09-01T00:00:00Z'))).toBe('2026.9.0');
    expect(CALVER.test('2026.09.0')).toBe(false);
  });

  test('月は 1〜12 だけ', () => {
    expect(CALVER.test('2026.12.0')).toBe(true);
    expect(CALVER.test('2026.13.0')).toBe(false);
    expect(CALVER.test('2026.0.0')).toBe(false);
  });

  test('いま宣言しているバージョンが CalVer の形をしている', async () => {
    const manifest = (await Bun.file('package.json').json()) as {
      version: string;
    };
    expect(CALVER.test(manifest.version)).toBe(true);
  });
});
