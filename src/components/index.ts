/**
 * 組み込みコンポーネント。
 * 出力先の切り替え (§5.1)、装飾 (§5.2)、レイアウト (§5.3)、
 * 状態の記号 (§5.4)、データ表示 (§5.5)。
 */
import type { Renderable, Style } from '../jsx/types.ts';
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

/** OSC 8 のハイパーリンク。対応していない端末では URL をそのまま出す */
export interface LinkProps extends Style {
  href: string;
  children?: Renderable;
}

export const Link = host<LinkProps>('link', 'Link');

export interface IndentProps {
  /** 字下げする桁数 (既定 2) */
  by?: number;
  children?: Renderable;
}

/** 子ブロック全体を字下げする */
export const Indent = host<IndentProps>('indent', 'Indent');

export type BorderStyle = 'round' | 'single' | 'double' | 'none';

export interface BoxProps {
  border?: BorderStyle;
  title?: string;
  /** 端末幅に収まらない場合の最大幅 */
  maxWidth?: number;
  children?: Renderable;
}

/** 罫線で囲む */
export const Box = host<BoxProps>('box', 'Box');

export interface ColumnsProps {
  /** 列の間隔 (既定 2) */
  gap?: number;
  children?: Renderable;
}

/** 子を横並びにする。端末幅を超える場合は縮めて省略記号で切る */
export const Columns = host<ColumnsProps>('columns', 'Columns');

export type SymbolKind = 'success' | 'warn' | 'info' | 'danger';

export interface SymbolProps {
  kind: SymbolKind;
}

/**
 * 状態を表す記号。UTF-8 でない端末では ASCII に落ちる。
 * 通常は `<Success>` などのプリセットを使う
 */
export const Symbol = host<SymbolProps>('symbol', 'Symbol');

export type Cell = string | number | boolean | null | undefined;

export interface ListProps {
  items: readonly Cell[];
  /** 1. 2. 3. と番号を振る */
  ordered?: boolean;
  /** 箇条書きの記号 (既定 '-') */
  bullet?: string;
}

/** 箇条書き */
export const List = host<ListProps>('list', 'List');

export type Align = 'left' | 'right';

export interface TableProps {
  columns: readonly string[];
  rows: ReadonlyArray<readonly Cell[]>;
  /** 列ごとの寄せ (既定 left) */
  align?: readonly Align[];
  /** 見出しを出さない */
  headless?: boolean;
}

/** 表。列幅は内容から決め、端末幅を超える列は省略記号で切る */
export const Table = host<TableProps>('table', 'Table');

export interface KeyValueProps {
  data: Readonly<Record<string, Cell>>;
  /** キーの寄せ (既定 left) */
  align?: Align;
  /** キーと値の区切り (既定 ': ') */
  separator?: string;
}

/** `key: value` の整列表示 */
export const KeyValue = host<KeyValueProps>('keyvalue', 'KeyValue');

export interface JsonProps {
  value: unknown;
  /** 字下げの桁数 (既定 2) */
  indent?: number;
}

/** 構文着色付きの JSON */
export const Json = host<JsonProps>('json', 'Json');

export { Danger, Info, Success, Warn, type StatusProps } from './status.tsx';
