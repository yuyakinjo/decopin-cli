import { resolve } from 'node:path';

import { resolveHosts } from '../jsx/resolve.ts';
import type { Renderable } from '../jsx/types.ts';

export interface EvaluationProblem {
  /** どのファイルの話か */
  file: string;
  message: string;
}

/** 宣言ファイルを import して呼び、組み込みノードの並びにする */
export async function loadHosts(file: string, expected: string) {
  // 絶対パスにしないと、呼び出し元の位置によって解決が変わる
  const loaded = (await import(resolve(file))) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new Error(
      `must default-export a function that returns <${expected}>`
    );
  }
  return resolveHosts((declare as () => Renderable)());
}

/** 宣言評価中の例外を、呼び出し側がまとめて扱える問題にする */
export function evaluationProblem(
  file: string,
  error: unknown
): EvaluationProblem {
  return {
    file,
    message: error instanceof Error ? error.message : String(error),
  };
}
