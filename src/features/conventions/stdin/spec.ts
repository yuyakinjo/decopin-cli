import type { TypeNode } from '../../../core/types/type-node.ts';

/** 標準入力の読み方 (ADR 2) */
export type StdinMode = 'text' | 'lines' | 'json';

export interface StdinSpec {
  mode: StdinMode;
  /** 真なら、パイプされていない (端末) 場合にエラーにする */
  required: boolean;
  /** 末尾の空白と改行を落とす (mode="text" のときだけ意味がある) */
  trim: boolean;
  /** mode="json" のときの構造 (省略時は unknown) */
  type?: TypeNode;
  /** valibot スキーマを直接渡した場合 (ADR 9)。type とは排他 */
  schema?: unknown;
}
