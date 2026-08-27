/** `argv.tsx` を評価した結果 (§4.1) */
import type { TypeNode } from './type-node.ts';

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

export interface ArgvSpec {
  /** コマンドの説明 (help の 1 行目に出る) */
  description?: string;
  args: ArgSpec[];
  options: OptionSpec[];
}

export const EMPTY_ARGV_SPEC: ArgvSpec = { args: [], options: [] };

/** 環境変数 1 つの宣言 (§4.7) */
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

/** `--version` の内容 (§4.7) */
export interface VersionSpec {
  version: string;
  name?: string;
}

/** 標準入力の読み方 (§4.2) */
export type StdinMode = 'text' | 'lines' | 'json';

export interface StdinSpec {
  mode: StdinMode;
  /** 真なら、パイプされていない (端末) 場合にエラーにする */
  required: boolean;
  /** 末尾の空白と改行を落とす (mode="text" のときだけ意味がある) */
  trim: boolean;
  /** mode="json" のときの構造 (省略時は unknown) */
  type?: TypeNode;
  /** valibot スキーマを直接渡した場合 (§4.8)。type とは排他 */
  schema?: unknown;
}
