/**
 * 組み込みコンポーネント。
 * 出力先の切り替え、装飾、レイアウト、状態の記号、データ表示。
 */
import type { Renderable, Style } from '../jsx/types.ts';
import { host } from './host.ts';

/** インラインの装飾。入れ子にすると内側の指定が勝つ */
export interface TextProps extends Style {
  children?: Renderable;
}

/** 1 行分。子はインラインとして横に連結される */
export interface LineProps {
  children?: Renderable;
}

/** 子ブロックを受け取るだけの props (`<Stdout>` / `<Stderr>`) */
export interface BlockProps {
  children?: Renderable;
}

/** 終了コードの宣言 */
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

/**
 * 時間で書き換わる領域 (ADR 22)。`source` が値を返すたびに `children`
 * を呼び直し、stderr の領域を描き換える。source が尽きたら最後のフレームが
 * 静的テキストとして確定し、ドキュメントの続きが流れる
 */
export interface DynamicProps<T = unknown> {
  /** フレームの元になる値の列 (async generator をそのまま渡せる) */
  source: AsyncIterable<T>;
  /** 最新の値からフレームを描く。時刻を読めば interval だけでも動く */
  children: (value: T) => Renderable;
  /**
   * 新しい値が無くても再描画する間隔 (ミリ秒)。
   * スピナーのような時刻依存のフレームに使う。省略時は値が来たときだけ描く
   */
  interval?: number;
}

/** `<Dynamic source={...}>{(value) => ...}</Dynamic>` を型引数付きで書けるようにする */
export interface DynamicHost {
  <T>(props: DynamicProps<T>): never;
  readonly $host: 'dynamic';
}

/** 時間で書き換わる領域。ドキュメントの直下 (ブロック位置) にだけ置ける */
export const Dynamic = host<DynamicProps>(
  'dynamic',
  'Dynamic'
) as unknown as DynamicHost;

/** OSC 8 のハイパーリンク。対応していない端末では URL をそのまま出す */
export interface LinkProps extends Style {
  href: string;
  children?: Renderable;
}

export const Link = host<LinkProps>('link', 'Link');

/** 子ブロック全体の字下げ */
export interface IndentProps {
  /** 字下げする桁数 (既定 2) */
  by?: number;
  children?: Renderable;
}

/** 子ブロック全体を字下げする */
export const Indent = host<IndentProps>('indent', 'Indent');

/** 罫線の種類。UTF-8 でない端末では ASCII (`+-|`) に落ちる */
export type BorderStyle = 'round' | 'single' | 'double' | 'none';

/**
 * 罫線で囲む。幅は**内容に合わせる** (端末幅まで広げない)。
 * 端末幅を超える場合だけ縮めて省略記号で切る
 */
export interface BoxProps {
  border?: BorderStyle;
  title?: string;
  /** 端末幅に収まらない場合の最大幅 */
  maxWidth?: number;
  children?: Renderable;
}

/** 罫線で囲む */
export const Box = host<BoxProps>('box', 'Box');

/**
 * 子 1 つを 1 列として横に並べる。
 * 合計が端末幅を超える場合は比率を保って縮める (最低 3 桁は残す)
 */
export interface ColumnsProps {
  /** 列の間隔 (既定 2) */
  gap?: number;
  children?: Renderable;
}

/** 子を横並びにする。端末幅を超える場合は縮めて省略記号で切る */
export const Columns = host<ColumnsProps>('columns', 'Columns');

/** 状態を表す記号の種類 */
export type SymbolKind = 'success' | 'warn' | 'info' | 'danger';

/** 記号だけを行の中に置きたいときに使う */
export interface SymbolProps {
  kind: SymbolKind;
}

/**
 * 状態を表す記号。UTF-8 でない端末では ASCII に落ちる。
 * 通常は `<Success>` などのプリセットを使う
 */
export const Symbol = host<SymbolProps>('symbol', 'Symbol');

/**
 * 回転する記号。`<Dynamic>` の中で使うと、描き直しのたびに次のコマに進む。
 *
 * 時刻ではなく**描き直しの回数**で進むので、コンポーネントは純粋なまま
 * (同じ入力なら同じ出力)。静的な出力の中では最初のコマで止まる (ADR 23)
 */
export type SpinnerProps = Record<never, never>;

/** 回転する記号。UTF-8 でない端末では ASCII に落ちる */
export const Spinner = host<SpinnerProps>('spinner', 'Spinner');

/** 進捗のバー。行の中に置けるので、割合や説明と並べて書ける */
export interface ProgressBarProps {
  /** 現在の値。0 未満と max 超は端で止める */
  value: number;
  /** 満了とみなす値 (既定 100) */
  max?: number;
  /** バーの桁数 (既定 20) */
  width?: number;
}

/** 進捗のバー。UTF-8 でない端末では ASCII (`#-`) に落ちる */
export const ProgressBar = host<ProgressBarProps>('progress', 'ProgressBar');

/** 表やリストに渡せる値。`null` / `undefined` は空文字になる */
export type Cell = string | number | boolean | null | undefined;

/** 箇条書き。`ordered` を付けると番号の桁を揃える */
export interface ListProps {
  items: readonly Cell[];
  /** 1. 2. 3. と番号を振る */
  ordered?: boolean;
  /** 箇条書きの記号 (既定 '-') */
  bullet?: string;
}

/** 箇条書き */
export const List = host<ListProps>('list', 'List');

/** 桁揃えの向き */
export type Align = 'left' | 'right';

/**
 * 表。列幅は内容から決め、端末幅を超える場合は縮めて省略記号で切る。
 *
 * セルは JSX ではなくデータで受け取る。桁を揃えるには表示幅の計算が必要で、
 * それをコンポーネント側に持ち込むよりレンダラーに置く方が素直なため
 */
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

/**
 * `key: value` の整列表示。**区切りごと**桁を合わせる
 * (キーだけ揃えると `routes : 6` のようにずれる)
 */
export interface KeyValueProps {
  data: Readonly<Record<string, Cell>>;
  /** キーの寄せ (既定 left) */
  align?: Align;
  /** キーと値の区切り (既定 ': ') */
  separator?: string;
}

/** `key: value` の整列表示 */
export const KeyValue = host<KeyValueProps>('keyvalue', 'KeyValue');

/** 構文着色付きの JSON */
export interface JsonProps {
  value: unknown;
  /** 字下げの桁数 (既定 2) */
  indent?: number;
}

/** 構文着色付きの JSON */
export const Json = host<JsonProps>('json', 'Json');

export { Danger, Info, Success, Warn, type StatusProps } from './status.tsx';

export { DidYouMean } from './patterns.tsx';
export type { DidYouMeanProps } from './patterns.tsx';
