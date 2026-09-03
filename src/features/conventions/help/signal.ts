/** `help()` に渡せるもの。全部省略できる */
export interface HelpInput {
  /** 使い方の前に出す一行 (なぜ見せられているのか) */
  message?: string;
  /**
   * 終了コード。既定は 2。
   *
   * `--help` は「求められたから出す」ので stdout + 0 だが、`help()` は
   * 「そのままでは進めないから出す」ので stderr + 2 になる
   * (test/contract/routing.test.tsx の表と揃える)
   */
  exitCode?: number;
}

/** 投げられた印。run() が拾って使い方を見せる */
export interface HelpSignal {
  readonly $help: true;
  readonly message: string | undefined;
  readonly exitCode: number;
}

export function isHelpSignal(value: unknown): value is HelpSignal {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $help?: unknown }).$help === true
  );
}

/**
 * このコマンドの使い方を見せて打ち切る。戻ってこない。
 *
 * ```tsx
 * if (args.target === undefined && options.all !== true) {
 *   help({ message: 'give a target, or pass --all' });
 * }
 * ```
 *
 * `help.tsx` を置いていれば、そちらが使われる (ADR 8)。
 *
 * @returns 戻り値の型が `never` なので、この後は絞り込みが効く
 */
export function help(input: HelpInput = {}): never {
  const signal: HelpSignal = {
    $help: true,
    message: input.message,
    exitCode: input.exitCode ?? 2,
  };
  throw signal;
}
