/**
 * 規約ファイルをビルド時に評価して宣言を取り出す (ADR 5 の evaluate)。
 *
 * AST 解析ではなく「import して呼ぶ」方式なので、`_` 配下の共有
 * コンポーネントもそのまま展開される (ADR 9)。その代わり宣言ファイルは
 * 純粋でなければならない (test/contract/argv-parsing.test.ts)。
 */
import { evaluateArgv } from '../../features/conventions/argv/evaluate.ts';
import type { ArgvSpec } from '../../features/conventions/argv/spec.ts';
import { evaluateOutput } from '../../features/conventions/output/evaluate.ts';
import type { OutputSpec } from '../../features/conventions/output/spec.ts';
import { evaluateStdin } from '../../features/conventions/stdin/evaluate.ts';
import type { StdinSpec } from '../../features/conventions/stdin/spec.ts';
import { evaluateEnv } from '../../features/root-only/env/evaluate.ts';
import type { EnvEvaluation } from '../../features/root-only/env/evaluate.ts';
import type { EvaluationProblem } from './evaluate-declaration.ts';
import type { Route } from './scanner.ts';

export { evaluateEnv };
export type { EnvEvaluation, EvaluationProblem };

export interface EvaluatedRoute {
  route: Route;
  spec: ArgvSpec;
  /** stdin.tsx があれば、その宣言 */
  stdin?: StdinSpec;
  /** output.tsx があれば、その宣言 (ADR 28) */
  output?: OutputSpec;
}

export interface EvaluateResult {
  evaluated: EvaluatedRoute[];
  problems: EvaluationProblem[];
}

/**
 * 誤りは 1 件目で止めずに全部集める。
 * ビルドし直すたびに 1 つずつ直す手間を避けるため (test/contract/argv-parsing.test.ts と同じ考え方)。
 */
export async function evaluateRoutes(routes: Route[]): Promise<EvaluateResult> {
  const evaluated: EvaluatedRoute[] = [];
  const problems: EvaluationProblem[] = [];

  for (const route of routes) {
    const argv = await evaluateArgv(route.files.argv);
    const stdin = await evaluateStdin(route.files.stdin);
    const output = await evaluateOutput(route.files.output);
    const routeProblems = [argv.problem, stdin.problem, output.problem];

    for (const problem of routeProblems) {
      if (problem !== undefined) problems.push(problem);
    }

    if (routeProblems.every((problem) => problem === undefined)) {
      evaluated.push({
        route,
        spec: argv.spec,
        stdin: stdin.spec,
        output: output.spec,
      });
    }
  }

  return { evaluated, problems };
}
