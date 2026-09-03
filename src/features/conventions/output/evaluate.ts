import {
  evaluationProblem,
  loadHosts,
} from '../../../build/evaluate-declaration.ts';
import type { EvaluationProblem } from '../../../build/evaluate-declaration.ts';
import { parseOutputSpec } from './parse.ts';
import type { OutputSpec } from './spec.ts';

export interface OutputEvaluation {
  spec?: OutputSpec;
  problem?: EvaluationProblem;
}

/** `output.tsx` があれば、その宣言を評価する */
export async function evaluateOutput(
  file: string | undefined
): Promise<OutputEvaluation> {
  if (file === undefined) return {};
  try {
    return { spec: parseOutputSpec(await loadHosts(file, 'Output')) };
  } catch (error) {
    return { problem: evaluationProblem(file, error) };
  }
}
