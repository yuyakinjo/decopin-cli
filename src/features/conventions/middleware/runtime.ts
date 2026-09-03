/**
 * `middleware.tsx` でコマンドの実行を包む (ADR 13)。
 *
 * `layout.tsx` の `children` が「値」なのに対し、middleware が受け取る
 * `next` は**関数**。呼ばないと中が走らないので、時間を測る・後片付けを
 * する・例外を捕まえる、ができる。名前を分けているのはこの違いのため。
 */
import type { Renderable } from '../../../core/jsx/types.ts';
import { CliError } from '../../../core/runtime/errors.ts';

export type MiddlewareLoader = () => Promise<unknown>;

/** middleware が受け取るもの。args / options は検証済み (ADR 11) */
export interface MiddlewareContext {
  /** 検証済みの環境変数 */
  env: Record<string, unknown>;
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
  /** `--dry-run` が付いているか (ADR 37) */
  dryRun: boolean;
}

/**
 * `middleware.tsx` が受け取る props。
 *
 * `next` は**呼ぶまで走らない関数**。`layout.tsx` の `children` (値) と
 * 意味が違うので名前を分けている (ADR 13)
 */
export interface MiddlewareProps extends MiddlewareContext {
  /**
   * 内側の処理を走らせて、その出力を返す。
   * 呼ばなければコマンドは実行されない。
   */
  next: () => Promise<Renderable>;
}

type Middleware = (props: MiddlewareProps) => Renderable | Promise<Renderable>;

/**
 * @param loaders **外側から順** (ルート → ... → 自分のディレクトリ)
 * @param base 最も内側の処理 (コマンドの実行)
 */
export async function runMiddleware(
  loaders: MiddlewareLoader[],
  base: () => Promise<Renderable>,
  context: MiddlewareContext
): Promise<Renderable> {
  const dispatch = async (index: number): Promise<Renderable> => {
    const loader = loaders[index];
    if (loader === undefined) return base();

    const loaded = (await loader()) as { default?: unknown };
    const middleware = loaded.default;
    if (typeof middleware !== 'function') {
      throw new CliError('middleware.tsx must default-export a function');
    }
    return (middleware as Middleware)({
      ...context,
      next: () => dispatch(index + 1),
    });
  };

  return dispatch(0);
}
