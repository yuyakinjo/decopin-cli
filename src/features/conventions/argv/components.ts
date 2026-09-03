import { host } from '../../../core/components/host.ts';
import type { Renderable } from '../../../core/jsx/types.ts';

/** 型の短縮形。制約が要らない場合はこれで足りる */
export type ShorthandType = 'string' | 'number' | 'boolean';

/** 引数宣言のルート。`description` は `--help` の 1 行目に出る */
export interface ArgvProps {
  /** コマンドの説明 (help の 1 行目) */
  description?: string;
  children?: Renderable;
}

/**
 * 位置引数。JSX 上の記述順がそのまま引数の順になる。
 *
 * 型は children (`Type.*`) か `type` 短縮形で、存在 (`required` / `default`) は
 * props で決める。「省略できるか」は型ではなく存在の話なので分けている
 */
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

/**
 * 名前付きオプション (`--name` / `-a`)。
 * `alias` は 1 文字。boolean の alias だけ `-lv` のように束ねられる
 */
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
