/**
 * PR に貼る計測結果の本文 (ADR 24)。
 *
 * 数字を出すのは hyperfine で、ここは組み立てだけ。ランナーの上で
 * 動かさなくても、退行の見え方と base 欠損時の振る舞いを固定できる
 */
import { describe, expect, test } from 'bun:test';

import {
  MARKER,
  benchReport,
  readBytes,
  readMeasurement,
} from '../../scripts/bench-report.ts';
import type { ReportInput } from '../../scripts/bench-report.ts';

/** 秒で渡す (hyperfine の単位) */
const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  head: { mean: 0.018, stddev: 0.001 },
  base: { mean: 0.018, stddev: 0.001 },
  floor: { mean: 0.007, stddev: 0.001 },
  baseRef: 'main',
  runs: 50,
  ...over,
});

describe('benchReport', () => {
  test('書き換え先を見つけるための目印を先頭に置く', () => {
    expect(benchReport(input()).startsWith(MARKER)).toBe(true);
  });

  test('固定費を引いた「取り分」を出す', () => {
    // 18ms - 7ms = 11ms。合計にはランナーの速さと Bun の起動が混ざる
    expect(benchReport(input())).toContain('11.0 ms');
  });

  test('遅くなったら + で出る', () => {
    const report = benchReport(input({ head: { mean: 0.02, stddev: 0.001 } }));
    expect(report).toContain('+2.0 ms (+11.1%)');
  });

  test('速くなったら - で出る', () => {
    const report = benchReport(input({ head: { mean: 0.016, stddev: 0.001 } }));
    expect(report).toContain('-2.0 ms (-11.1%)');
  });

  test('base をビルドできなくても本文は出る', () => {
    const report = benchReport(input({ base: undefined }));
    expect(report).toContain('not built');
    expect(report).toContain('nothing to compare');
    // 比較できなくても、この枝の数字は読める
    expect(report).toContain('11.0 ms');
  });

  test('比較対象のブランチ名を出す', () => {
    expect(benchReport(input({ baseRef: 'release' }))).toContain('`release`');
  });

  test('ノイズの読み方を添える (落とすためのゲートではない)', () => {
    expect(benchReport(input())).toContain('noise');
  });

  test('サイズを渡さなければサイズの節は出ない', () => {
    expect(benchReport(input())).not.toContain('Bundle size');
  });
});

describe('benchReport の bundle size', () => {
  // 最小 CLI を minify した実測が 75.3 KB 前後 (2026-09)
  const bundle = { head: 77_107, base: 75_000 };

  test('最小 CLI のサイズを KB で出す', () => {
    const report = benchReport(input({ bundle }));
    expect(report).toContain('## Bundle size');
    expect(report).toContain('75.3 KB');
    expect(report).toContain('hello-app');
  });

  test('増えたら + で、比率も出す', () => {
    // 2107 bytes = 2.1 KB, 2107 / 75000 = 2.8%
    expect(benchReport(input({ bundle }))).toContain('+2.1 KB (+2.8%)');
  });

  test('減ったら - で出る', () => {
    const report = benchReport(
      input({ bundle: { head: 73_000, base: 75_000 } })
    );
    expect(report).toContain('-2.0 KB (-2.7%)');
  });

  test('base が無ければ PR 側の数字だけ出す', () => {
    const report = benchReport(input({ bundle: { head: 77_107 } }));
    expect(report).toContain('75.3 KB');
    expect(report).toContain('not built');
    expect(report).not.toContain('KB (+');
  });

  test('バイト数は決定的なのでノイズ扱いしないと書く', () => {
    expect(benchReport(input({ bundle }))).toContain('deterministic');
  });
});

describe('readBytes', () => {
  test('環境変数の数字を読む', () => {
    expect(readBytes('77107')).toBe(77_107);
  });

  test('空・数字以外・0 は「無い」扱い (0 KB として通さない)', () => {
    expect(readBytes(undefined)).toBeUndefined();
    expect(readBytes('')).toBeUndefined();
    expect(readBytes('abc')).toBeUndefined();
    expect(readBytes('0')).toBeUndefined();
  });
});

describe('readMeasurement', () => {
  test('hyperfine の JSON から最初の結果を読む', () => {
    const json = JSON.stringify({
      results: [{ command: 'cli hello', mean: 0.0182, stddev: 0.0004 }],
    });
    expect(readMeasurement(json)).toEqual({ mean: 0.0182, stddev: 0.0004 });
  });

  test('結果が無ければ誤りとして落とす (0ms として通さない)', () => {
    expect(() => readMeasurement('{"results":[]}')).toThrow('no usable result');
  });
});
