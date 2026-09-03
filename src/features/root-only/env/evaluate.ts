import {
  evaluationProblem,
  loadHosts,
} from '../../../build/evaluate-declaration.ts';
import type { EvaluationProblem } from '../../../build/evaluate-declaration.ts';
import { parseEnvSpec } from './parse.ts';
import type { EnvSpec } from './spec.ts';

export interface EnvEvaluation {
  spec?: EnvSpec;
  problem?: EvaluationProblem;
}

/** `app/env.tsx` を評価する (型生成と実行時の両方で同じ宣言を使う) */
export async function evaluateEnv(
  file: string | undefined
): Promise<EnvEvaluation> {
  if (file === undefined) return {};
  try {
    return { spec: parseEnvSpec(await loadHosts(file, 'Env')) };
  } catch (error) {
    return { problem: evaluationProblem(file, error) };
  }
}
