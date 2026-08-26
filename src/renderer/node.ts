/** 評価済みの中間ノード木 (§6.1 の (1) の出力) */
import type { Fd, Style } from '../jsx/types.ts';

export type RenderNode =
  /** 文字そのもの */
  | { kind: 'chars'; value: string }
  /** インライン装飾 */
  | { kind: 'text'; style: Style; children: RenderNode[] }
  /** 1 行 (末尾に改行) */
  | { kind: 'line'; children: RenderNode[] }
  /** 空行 */
  | { kind: 'br' }
  /** 出力先の切り替え */
  | { kind: 'fd'; fd: Fd; children: RenderNode[] }
  /** 終了コードの宣言 */
  | { kind: 'exit'; code: number }
  /** Fragment / 配列 */
  | { kind: 'group'; children: RenderNode[] };
