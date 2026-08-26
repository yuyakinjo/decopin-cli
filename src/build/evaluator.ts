/**
 * `argv.tsx` をビルド時に評価して宣言を取り出す (§8 の evaluate)。
 *
 * AST 解析ではなく「import して呼ぶ」方式なので、`_` 配下の共有
 * コンポーネントもそのまま展開される (§4.8)。その代わり argv.tsx は
 * 純粋でなければならない (§4.1)。
 */
import { resolve } from 'node:path';

import { parseArgvSpec } from '../declaration/parse.ts';
import { resolveHosts } from '../declaration/resolve.ts';
import { EMPTY_ARGV_SPEC } from '../declaration/spec.ts';
import type { ArgvSpec } from '../declaration/spec.ts';
import type { Renderable } from '../jsx/types.ts';
import type { Route } from './scanner.ts';

export interface EvaluatedRoute {
  route: Route;
  spec: ArgvSpec;
}

export interface EvaluationProblem {
  /** どのファイルの話か */
  file: string;
  message: string;
}

export interface EvaluateResult {
  evaluated: EvaluatedRoute[];
  problems: EvaluationProblem[];
}

async function loadSpec(file: string): Promise<ArgvSpec> {
  // 絶対パスにしないと、呼び出し元の位置によって解決が変わる
  const loaded = (await import(resolve(file))) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new Error('must default-export a function that returns <Argv>');
  }
  const hosts = await resolveHosts((declare as () => Renderable)());
  return parseArgvSpec(hosts);
}

/**
 * 誤りは 1 件目で止めずに全部集める。
 * ビルドし直すたびに 1 つずつ直す手間を避けるため (§8.2 と同じ考え方)。
 */
export async function evaluateRoutes(routes: Route[]): Promise<EvaluateResult> {
  const evaluated: EvaluatedRoute[] = [];
  const problems: EvaluationProblem[] = [];

  for (const route of routes) {
    const file = route.files.argv;
    if (file === undefined) {
      evaluated.push({ route, spec: EMPTY_ARGV_SPEC });
      continue;
    }
    try {
      evaluated.push({ route, spec: await loadSpec(file) });
    } catch (error) {
      problems.push({
        file,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { evaluated, problems };
}
