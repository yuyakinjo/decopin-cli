/**
 * 自作 jsx-runtime (ADR 1)。React には依存しない。
 *
 * `tsconfig.json` の `jsxImportSource` をこのパッケージに向けることで、
 * `<Text>` などがこの `jsx()` を通って {@link Element} になる。
 */
import type {
  AnyElementType,
  Element as DecopinElement,
  Renderable,
} from './types.ts';

export function jsx(
  type: AnyElementType,
  props: Record<string, unknown>
): DecopinElement {
  return { $decopin: 'element', type, props };
}

/** 子が複数ある場合に呼ばれる。挙動は {@link jsx} と同じ */
export const jsxs = jsx;

/** `<>...</>`。children をそのまま返すだけの素通しコンポーネント */
export function Fragment(props: { children?: Renderable }): Renderable {
  return props.children;
}

export declare namespace JSX {
  /** JSX 式の型。ADR 9 のとおり、ここに型引数は運べない */
  type Element = DecopinElement;

  /** タグに書けるもの。組み込みの小文字タグ (`<div>`) は許さない */
  type ElementType = (props: never) => Renderable | Promise<Renderable> | never;

  interface IntrinsicElements {
    // 意図的に空。すべてのコンポーネントは大文字で import して使う
  }

  interface IntrinsicAttributes {
    key?: string | number;
  }

  interface ElementChildrenAttribute {
    children: Record<never, never>;
  }
}
