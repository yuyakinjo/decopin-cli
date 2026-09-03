/**
 * 開発ビルド用の jsx-runtime。現時点では本番と同じ挙動 (ADR 1)。
 * 将来ここに「どのファイルの何行目の要素か」を持たせてエラーを親切にする。
 */
import { jsx } from './jsx-runtime.ts';
import type { AnyElementType, Element } from './types.ts';

export function jsxDEV(
  type: AnyElementType,
  props: Record<string, unknown>
): Element {
  return jsx(type, props);
}

export { Fragment, type JSX } from './jsx-runtime.ts';
