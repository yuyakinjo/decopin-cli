/**
 * 副作用の到達判定の語彙 (ADR 32)。
 *
 * 判定そのものはビルド時 (`src/build/effects.ts`) に行うが、結果は
 * `routes.ts` に焼き込まれて実行時にも読まれる (MCP の annotations に
 * 変わる。ADR 33)。両側が同じ語彙を見るので、型はここに置く。
 */

/** 見張る副作用の種類 */
export type EffectCategory =
  | 'fs.read'
  | 'fs.write'
  | 'network'
  | 'process.spawn'
  | 'process.mutate';

export const EFFECT_CATEGORIES: readonly EffectCategory[] = [
  'fs.read',
  'fs.write',
  'network',
  'process.spawn',
  'process.mutate',
];

/**
 * - `none`: 到達しないことを確かめた
 * - `detected`: 到達する (経路を出せる)
 * - `unknown`: 解析を諦めた。保証しない
 */
export type Verdict = 'none' | 'detected' | 'unknown';

/** コマンド 1 つ分の、種類ごとの判定 */
export type EffectVerdicts = Record<EffectCategory, Verdict>;
