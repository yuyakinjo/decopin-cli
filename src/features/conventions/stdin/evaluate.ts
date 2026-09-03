import {
  evaluationProblem,
  loadHosts,
} from '../../../build/evaluate-declaration.ts';
import type { EvaluationProblem } from '../../../build/evaluate-declaration.ts';
import { parseStdinSpec } from './parse.ts';
import type { StdinSpec } from './spec.ts';

export interface StdinEvaluation {
  spec?: StdinSpec;
  problem?: EvaluationProblem;
}

/** `stdin.tsx` があれば、その宣言を評価する */
export async function evaluateStdin(
  file: string | undefined
): Promise<StdinEvaluation> {
  if (file === undefined) return {};
  try {
    return { spec: parseStdinSpec(await loadHosts(file, 'Stdin')) };
  } catch (error) {
    return { problem: evaluationProblem(file, error) };
  }
}
