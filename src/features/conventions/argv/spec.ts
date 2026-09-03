import type { TypeNode } from '../../../declaration/type-node.ts';

/** `<Arg>` を評価した結果 */
export interface ArgSpec {
  name: string;
  description?: string;
  /** 省略できないか */
  required: boolean;
  /** 省略時の値。required とは同時に指定できない */
  defaultValue?: unknown;
  /** 位置引数を複数取るか (最後の 1 つだけに付けられる) */
  variadic: boolean;
  type: TypeNode;
}

/** `<Option>` を評価した結果 */
export interface OptionSpec {
  name: string;
  /** 1 文字の短縮形 */
  alias?: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  /** help に出さない */
  hidden: boolean;
  type: TypeNode;
}

/** `argv.tsx` 全体を評価した結果。検証・help・型生成の元になる */
export interface ArgvSpec {
  /** コマンドの説明 (help の 1 行目に出る) */
  description?: string;
  args: ArgSpec[];
  options: OptionSpec[];
}

export const EMPTY_ARGV_SPEC: ArgvSpec = { args: [], options: [] };
