/**
 * JSX の要素表現と、レンダラーが解釈する組み込みコンポーネントの標識。
 *
 * §4.8 で確認したとおり JSX 式の型は `JSX.Element` に潰れるため、要素に
 * 型引数を運ばせることは狙わない。要素は「何を描くか」を持つだけのデータ構造。
 */

/** 出力先のファイルディスクリプタ。1 = stdout, 2 = stderr */
export type Fd = 1 | 2;

/** ANSI の基本 8 色 + 明色 8 色 */
export type ColorName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite';

/** 16 色名 または `#rrggbb` */
export type Color = ColorName | `#${string}`;

/** インラインの装飾 (§5.2) */
export interface Style {
  color?: Color;
  bg?: Color;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

/** レンダラーが解釈する組み込みコンポーネントの種類 */
export type HostKind = 'text' | 'line' | 'br' | 'stdout' | 'stderr' | 'exit';

/** ユーザーが書く関数コンポーネント。async でもよい */
export type Component<P> = (props: P) => Renderable | Promise<Renderable>;

/**
 * 組み込みコンポーネント。呼び出されることはなく、レンダラーが `$host` を
 * 見て解釈する。返り値型が `never` なのはそのため。
 */
export interface HostComponent<P> {
  (props: P): never;
  readonly $host: HostKind;
}

/** 型引数を捨てた組み込みコンポーネント (要素に保持する形) */
export interface AnyHostComponent {
  (props: never): never;
  readonly $host: HostKind;
}

/** 型引数を捨てた関数コンポーネント (要素に保持する形) */
export type AnyComponent = (props: never) => Renderable | Promise<Renderable>;

export type AnyElementType = AnyHostComponent | AnyComponent;

/** JSX 要素 (未評価) */
export interface Element {
  readonly $decopin: 'element';
  readonly type: AnyElementType;
  readonly props: Record<string, unknown>;
}

/** レンダリング可能なもの。`null` / `undefined` / `boolean` は何も描かない */
export type Renderable =
  | Element
  | string
  | number
  | boolean
  | null
  | undefined
  | Renderable[];

export function isElement(value: unknown): value is Element {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $decopin?: unknown }).$decopin === 'element'
  );
}

export function isHost(type: AnyElementType): type is AnyHostComponent {
  return '$host' in type;
}
