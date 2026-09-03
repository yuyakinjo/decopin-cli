import { host } from '../../../core/components/host.ts';
import type { Renderable } from '../../../core/jsx/types.ts';

/** 標準入力の読み方 */
export interface StdinProps {
  /** 'text' = 全文, 'lines' = 改行で分割, 'json' = JSON.parse */
  mode: 'text' | 'lines' | 'json';
  /** 真なら、パイプされていない (端末) 場合にエラーにする */
  required?: boolean;
  /** 末尾の空白と改行を落とす (mode="text" のときだけ) */
  trim?: boolean;
  /**
   * valibot スキーマを直接渡すエスケープハッチ (ADR 9)。
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
