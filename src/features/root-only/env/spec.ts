import type { TypeNode } from '../../../types/type-node.ts';

/** 環境変数 1 つの宣言 */
export interface VarSpec {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  type: TypeNode;
}

export interface EnvSpec {
  vars: VarSpec[];
}

export const EMPTY_ENV_SPEC: EnvSpec = { vars: [] };
