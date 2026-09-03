import { closest } from '../cmd/router.ts';

/** `notFound()` に渡せるもの。全部省略できる */
export interface NotFoundInput {
  /** 何を探していたか (`'user'`, `'branch'`)。既定は `'resource'` */
  what?: string;
  /** 見つからなかった値 */
  requested?: string;
  /** 選べる値の一覧。ここから「もしかして」を自動で計算する */
  available?: Iterable<string>;
  /** 終了コード。既定は 1 (使い方の誤りではなく、無かっただけ) */
  exitCode?: number;
}

/** 投げられた印。レンダラーではなく run() が拾う */
export interface NotFoundSignal {
  readonly $notFound: true;
  readonly what: string;
  readonly requested: string;
  readonly available: readonly string[];
  readonly suggestion: string | undefined;
  readonly exitCode: number;
}

export function isNotFoundSignal(value: unknown): value is NotFoundSignal {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $notFound?: unknown }).$notFound === true
  );
}

/**
 * 「無かった」ことを伝えて打ち切る。戻ってこない。
 *
 * ```tsx
 * const user = users.find((u) => u.name === args.name);
 * if (user === undefined) {
 *   notFound({ what: 'user', requested: args.name, available: names });
 * }
 * ```
 *
 * `available` を渡せば「もしかして」は自動で付く (ADR 30)。
 *
 * @returns 戻り値の型が `never` なので、この後は絞り込みが効く
 */
export function notFound(input: NotFoundInput = {}): never {
  const available = [...(input.available ?? [])];
  const requested = input.requested ?? '';
  const signal: NotFoundSignal = {
    $notFound: true,
    what: input.what ?? 'resource',
    requested,
    available,
    suggestion: requested === '' ? undefined : closest(requested, available),
    exitCode: input.exitCode ?? 1,
  };
  throw signal;
}
