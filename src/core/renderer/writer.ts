/**
 * (4) 書き出し (ADR 1)。
 * fd ごとに 1 回だけ write する。分割して書くと、パイプ越しに
 * stdout と stderr が混ざったときに行が割れる事故が起きるため。
 */
import type { RenderResult } from './render.ts';

/** 書き出し先。テストから差し替えられるよう最小の形にしている */
export interface WritableLike {
  write(chunk: string): unknown;
}

/** stdout / stderr の書き出し先 */
export interface WriteTargets {
  stdout?: WritableLike;
  stderr?: WritableLike;
}

/** 書き出し順は stdout → stderr に固定する (ADR 1) */
export function write(result: RenderResult, targets: WriteTargets = {}): void {
  const out = targets.stdout ?? process.stdout;
  const err = targets.stderr ?? process.stderr;

  if (result.stdout !== '') out.write(result.stdout);
  if (result.stderr !== '') err.write(result.stderr);
}
