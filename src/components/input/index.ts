import type { Renderable } from '../../jsx/types.ts';
/**
 * 入力宣言コンポーネント (§5.1.1)。
 * stdout には描画されず、`--help` の生成と argv の検証にだけ使われる。
 */
import { host } from '../host.ts';

/** 型の短縮形。制約が要らない場合はこれで足りる */
export type ShorthandType = 'string' | 'number' | 'boolean';

export interface ArgvProps {
  /** コマンドの説明 (help の 1 行目) */
  description?: string;
  children?: Renderable;
}

export interface ArgProps {
  name: string;
  /** 制約なしの型の短縮形。children と同時には指定できない */
  type?: ShorthandType;
  required?: boolean;
  default?: unknown;
  description?: string;
  /** 位置引数を複数取る (最後の <Arg> だけに付けられる) */
  variadic?: boolean;
  children?: Renderable;
}

export interface OptionProps {
  name: string;
  type?: ShorthandType;
  required?: boolean;
  default?: unknown;
  /** 1 文字の短縮形 */
  alias?: string;
  description?: string;
  /** help に出さない */
  hidden?: boolean;
  children?: Renderable;
}

/** 引数宣言のルート */
export const Argv = host<ArgvProps>('argv', 'Argv');

/** 位置引数。記述順が引数の順になる */
export const Arg = host<ArgProps>('arg', 'Arg');

/** 名前付きオプション (`--name` / `-a`) */
export const Option = host<OptionProps>('option', 'Option');

export interface StdinProps {
  /** 'text' = 全文, 'lines' = 改行で分割, 'json' = JSON.parse */
  mode: 'text' | 'lines' | 'json';
  /** 真なら、パイプされていない (端末) 場合にエラーにする */
  required?: boolean;
  /** 末尾の空白と改行を落とす (mode="text" のときだけ) */
  trim?: boolean;
  /**
   * valibot スキーマを直接渡すエスケープハッチ (§4.8)。
   * `mode="json"` のときだけ使えて、children とは併用できない。
   *
   * 深い JSON を `Type.Object` / `Type.Field` で書くと縦に長くなるので、
   * その逃げ道。生成される型はスキーマを内省して決まる
   */
  schema?: object;
  /** mode="json" のときだけ、構造を Type.* で宣言できる */
  children?: Renderable;
}

/** 標準入力の読み方 (`stdin.tsx`) */
export const Stdin = host<StdinProps>('stdin', 'Stdin');

export interface EnvProps {
  children?: Renderable;
}

export interface VarProps {
  name: string;
  /** 制約なしの型の短縮形。children と同時には指定できない */
  type?: ShorthandType;
  required?: boolean;
  default?: unknown;
  description?: string;
  children?: Renderable;
}

/** 環境変数宣言のルート (`env.tsx`) */
export const Env = host<EnvProps>('env', 'Env');

/** 環境変数 1 つ */
export const Var = host<VarProps>('var', 'Var');

export interface VersionProps {
  version: string;
  /** 名前も出す場合 (`mycli 0.1.0`) */
  name?: string;
}

/** `--version` の内容 (`version.tsx`) */
export const Version = host<VersionProps>('version', 'Version');
