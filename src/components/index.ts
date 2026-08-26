import type { Renderable, Style } from '../jsx/types.ts';
/**
 * Phase 1 の組み込みコンポーネント。
 * 出力先の切り替え (§5.1)、インライン装飾 (§5.2)、行 (§5.3) の最小集合。
 */
import { host } from './host.ts';

export interface TextProps extends Style {
  children?: Renderable;
}

export interface LineProps {
  children?: Renderable;
}

export interface BlockProps {
  children?: Renderable;
}

export interface ExitProps {
  code: number;
}

/** インラインの装飾。入れ子にすると内側の指定が勝つ */
export const Text = host<TextProps>('text', 'Text');

/** 1 行。末尾に改行を付ける。子はインラインとして横に連結される */
export const Line = host<LineProps>('line', 'Line');

/** 空行 */
export const Br = host<Record<never, never>>('br', 'Br');

/** 子ツリーを stdout (fd 1) へ */
export const Stdout = host<BlockProps>('stdout', 'Stdout');

/** 子ツリーを stderr (fd 2) へ */
export const Stderr = host<BlockProps>('stderr', 'Stderr');

/** 終了コードを宣言する。ツリー内で最後に評価されたものが勝つ */
export const Exit = host<ExitProps>('exit', 'Exit');
