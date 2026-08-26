/** 評価済みの中間ノード木 (§6.1 の (1) の出力) */
import type {
  Align,
  BorderStyle,
  Cell,
  SymbolKind,
} from '../components/index.ts';
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
  | { kind: 'group'; children: RenderNode[] }
  /** OSC 8 のハイパーリンク */
  | { kind: 'link'; href: string; style: Style; children: RenderNode[] }
  /** 子ブロックの字下げ */
  | { kind: 'indent'; by: number; children: RenderNode[] }
  /** 罫線で囲む */
  | {
      kind: 'box';
      border: BorderStyle;
      title: string | undefined;
      maxWidth: number | undefined;
      children: RenderNode[];
    }
  /** 横並び。子 1 つが 1 列 */
  | { kind: 'columns'; gap: number; children: RenderNode[] }
  /** 状態の記号 */
  | { kind: 'symbol'; symbol: SymbolKind }
  /** 箇条書き */
  | { kind: 'list'; items: readonly Cell[]; ordered: boolean; bullet: string }
  /** 表 */
  | {
      kind: 'table';
      columns: readonly string[];
      rows: ReadonlyArray<readonly Cell[]>;
      align: readonly Align[];
      headless: boolean;
    }
  /** key: value の整列表示 */
  | {
      kind: 'keyvalue';
      data: Readonly<Record<string, Cell>>;
      align: Align;
      separator: string;
    }
  /** 構文着色付きの JSON */
  | { kind: 'json'; value: unknown; indent: number };
