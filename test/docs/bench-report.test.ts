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
