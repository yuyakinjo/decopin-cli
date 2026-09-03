import {
  evaluationProblem,
  loadHosts,
} from '../../../build/evaluate-declaration.ts';
import type { EvaluationProblem } from '../../../build/evaluate-declaration.ts';
import { parseArgvSpec } from './parse.ts';
import { EMPTY_ARGV_SPEC } from './spec.ts';
import type { ArgvSpec } from './spec.ts';

export interface ArgvEvaluation {
  spec: ArgvSpec;
  problem?: EvaluationProblem;
}

/** `argv.tsx` を評価する。無ければ空の宣言を返す */
export async function evaluateArgv(
  file: string | undefined
): Promise<ArgvEvaluation> {
  if (file === undefined) return { spec: EMPTY_ARGV_SPEC };
  try {
    return { spec: parseArgvSpec(await loadHosts(file, 'Argv')) };
  } catch (error) {
    return {
      spec: EMPTY_ARGV_SPEC,
      problem: evaluationProblem(file, error),
    };
  }
}
