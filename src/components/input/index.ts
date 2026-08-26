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
