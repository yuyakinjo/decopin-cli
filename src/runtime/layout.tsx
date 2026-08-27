/**
 * `layout.tsx` で出力を包む (ADR 7)。
 *
 * `children` は React と同じく**値**。レンダラーが評価するまで中身は走らない。
 * 包む順は「外側 = 上位ディレクトリ」なので、内側から順に組み立てる。
 */
import { jsx } from '../jsx/jsx-runtime.ts';
import type { AnyElementType, Renderable } from '../jsx/types.ts';
import { CliError } from './errors.ts';

export type LayoutLoader = () => Promise<unknown>;

export interface LayoutProps {
  children: Renderable;
}

async function loadLayout(loader: LayoutLoader): Promise<AnyElementType> {
  const loaded = (await loader()) as { default?: unknown };
  const layout = loaded.default;
  if (typeof layout !== 'function') {
    throw new CliError('layout.tsx must default-export a component');
  }
  return layout as AnyElementType;
}

/**
 * @param loaders **外側から順** (ルート → ... → 自分のディレクトリ)
 */
export async function applyLayouts(
  loaders: LayoutLoader[],
  node: Renderable
): Promise<Renderable> {
  let current = node;
  // 内側 (自分に近い層) から包み、最後にルートの layout で包む
  for (let index = loaders.length - 1; index >= 0; index -= 1) {
    const layout = await loadLayout(loaders[index] as LayoutLoader);
    current = jsx(layout, { children: current });
  }
  return current;
}
