import type { TypeNode } from '../../../types/type-node.ts';

/** `output.tsx` を評価した結果 (ADR 28) */
export interface OutputSpec {
  /** `Type.*` で組んだ形 */
  type?: TypeNode;
  /** valibot スキーマを直接渡した場合。type とは排他 */
  schema?: unknown;
}
