/**
 * 「利用者のファイルがあればそれを使い、無ければ / 失敗したら組み込みに戻る」
 * という共通の作法 (§4.4 の考え方を help / not-found にも適用する)。
 *
 * 表示係が落ちて何も出ないのが一番困るので、失敗は握って組み込みに戻す。
 */
import type { Renderable, RenderInput } from '../jsx/types.ts';

export interface Presentation {
  node: Renderable;
  /** 利用者のファイルが `export const skipLayout = true` を持っていたか */
  skipLayout: boolean;
  /** 利用者のファイルが使われたか (組み込みに戻った場合は false) */
  overridden: boolean;
}

/**
 * @param loader 利用者のファイル (無ければ undefined)
 * @param props 渡す props
 * @param builtin 組み込みの表示
 */
export async function present<P>(
  loader: (() => Promise<unknown>) | undefined,
  props: P,
  builtin: Renderable
): Promise<Presentation> {
  if (loader === undefined) {
    return { node: builtin, skipLayout: false, overridden: false };
  }

  try {
    const loaded = (await loader()) as {
      default?: unknown;
      skipLayout?: unknown;
    };
    const view = loaded.default;
    if (typeof view !== 'function') {
      return { node: builtin, skipLayout: false, overridden: false };
    }
    const produced = (await (view as (props: P) => RenderInput)(
      props
    )) as Renderable;
    return {
      node: produced,
      skipLayout: loaded.skipLayout === true,
      overridden: true,
    };
  } catch {
    // 上書きが落ちても、組み込みの表示だけは必ず出す
    return { node: builtin, skipLayout: false, overridden: false };
  }
}
