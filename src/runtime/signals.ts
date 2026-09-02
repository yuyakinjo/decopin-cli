/**
 * 投げるだけで「よくある結末」を伝える関数 (ADR 30)。
 *
 * Next.js の `notFound()` と同じ形。`data.tsx` / `command.tsx` のどこからでも
 * 呼べば、対応する規約ファイルが表示される。エラーの種類を宣言したり
 * 終了コードを決めたりする必要はなく、**よくある形が既に用意されている**
 * という状態にするのが狙い。
 */
import { CliError } from './errors.ts';
import { EXIT_CODE } from './exit.ts';
import { closest } from './router.ts';

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

/** `authRequired()` に渡せるもの */
export interface AuthRequiredInput {
  /** どこへの認証か (`'GitHub'`, `'AWS'`)。省略時は単に "Not authenticated" */
  service?: string;
  /** 直し方。打てるコマンドをそのまま書く (`'gh auth login'`) */
  fix?: string | readonly string[];
  /** 切れているのか、最初から無いのか。既定は無い扱い */
  expired?: boolean;
  /** 終了コード。既定 1 */
  exitCode?: number;
}

/**
 * 認証が要る / 切れている、を伝えて打ち切る (ADR 31)。
 *
 * ```tsx
 * if (env.GITHUB_TOKEN === undefined) {
 *   authRequired({ service: 'GitHub', fix: 'gh auth login' });
 * }
 * ```
 *
 * `--json` では `code: "auth"` と `hints` が出るので、エージェントは
 * 「認証し直す」という次の一手を機械的に決められる。
 */
export function authRequired(input: AuthRequiredInput = {}): never {
  const where = input.service === undefined ? '' : ` to ${input.service}`;
  const message =
    input.expired === true
      ? `Credentials${where} have expired`
      : `Not authenticated${where}`;
  throw new CliError(message, {
    kind: 'auth',
    exitCode: input.exitCode ?? EXIT_CODE.runtime,
    hints: toHints(input.fix),
  });
}

/** `missingTool()` に渡せるもの */
export interface MissingToolInput {
  /** 見つからなかったコマンド名 (`'git'`, `'session-manager-plugin'`) */
  tool: string;
  /** 何のために要るか (`'to clone the repository'`) */
  reason?: string;
  /** 入れ方。打てるコマンドをそのまま書く (`'brew install git'`) */
  install?: string | readonly string[];
  /** 終了コード。既定 1 */
  exitCode?: number;
}

/**
 * 必要な外部コマンドが無い、を伝えて打ち切る (ADR 31)。
 *
 * ```tsx
 * if (!(await which('session-manager-plugin'))) {
 *   missingTool({
 *     tool: 'session-manager-plugin',
 *     reason: 'to open the port forward',
 *     install: 'brew install --cask session-manager-plugin',
 *   });
 * }
 * ```
 */
export function missingTool(input: MissingToolInput): never {
  const why = input.reason === undefined ? '' : ` ${input.reason}`;
  throw new CliError(`${input.tool} is not installed${why}`, {
    kind: 'missing-tool',
    exitCode: input.exitCode ?? EXIT_CODE.runtime,
    hints: toHints(input.install),
  });
}

/** 1 本でも配列でも受ける (打てるコマンドは 1 つのことが多い) */
function toHints(fix: string | readonly string[] | undefined): string[] {
  if (fix === undefined) return [];
  return typeof fix === 'string' ? [fix] : [...fix];
}

/** Ctrl+C / Esc で打ち切られた印 (ADR 36)。何も表示せず 130 で終わる */
export interface InterruptSignal {
  readonly $interrupted: true;
  readonly exitCode: number;
}

export function isInterruptSignal(value: unknown): value is InterruptSignal {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { $interrupted?: unknown }).$interrupted === true
  );
}

/**
 * 利用者が打ち切った。エラーではないので何も出さず、シェル慣習の 130 で終わる。
 * raw mode の間は SIGINT が来ないので、Ctrl+C を読んだ側がこれを投げる
 */
export function interrupt(): never {
  const signal: InterruptSignal = {
    $interrupted: true,
    exitCode: EXIT_CODE.interrupted,
  };
  throw signal;
}
