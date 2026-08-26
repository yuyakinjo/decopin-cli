/**
 * `argv.tsx` をビルド時に評価して宣言を取り出す (§8 の evaluate)。
 *
 * AST 解析ではなく「import して呼ぶ」方式なので、`_` 配下の共有
 * コンポーネントもそのまま展開される (§4.8)。その代わり argv.tsx は
 * 純粋でなければならない (§4.1)。
 */
import { resolve } from 'node:path';

import { parseArgvSpec, parseStdinSpec } from '../declaration/parse.ts';
import { resolveHosts } from '../declaration/resolve.ts';
import { EMPTY_ARGV_SPEC } from '../declaration/spec.ts';
import type { ArgvSpec, StdinSpec } from '../declaration/spec.ts';
import type { Renderable } from '../jsx/types.ts';
import type { Route } from './scanner.ts';

export interface EvaluatedRoute {
  route: Route;
  spec: ArgvSpec;
  /** stdin.tsx があれば、その宣言 */
  stdin?: StdinSpec;
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

/** 宣言ファイルを import して呼び、組み込みノードの並びにする */
async function loadHosts(file: string, expected: string) {
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 誤りは 1 件目で止めずに全部集める。
 * ビルドし直すたびに 1 つずつ直す手間を避けるため (§8.2 と同じ考え方)。
 */
export async function evaluateRoutes(routes: Route[]): Promise<EvaluateResult> {
  const evaluated: EvaluatedRoute[] = [];
  const problems: EvaluationProblem[] = [];

  for (const route of routes) {
    const argvFile = route.files.argv;
    const stdinFile = route.files.stdin;
    let failed = false;

    let spec = EMPTY_ARGV_SPEC;
    if (argvFile !== undefined) {
      try {
        spec = parseArgvSpec(await loadHosts(argvFile, 'Argv'));
      } catch (error) {
        problems.push({ file: argvFile, message: messageOf(error) });
        failed = true;
      }
    }

    let stdin: StdinSpec | undefined;
    if (stdinFile !== undefined) {
      try {
        stdin = parseStdinSpec(await loadHosts(stdinFile, 'Stdin'));
      } catch (error) {
        problems.push({ file: stdinFile, message: messageOf(error) });
        failed = true;
      }
    }

    if (!failed) evaluated.push({ route, spec, stdin });
  }

  return { evaluated, problems };
}
