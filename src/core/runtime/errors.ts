/**
 * 実行時のエラー分類。
 * `error.tsx` はこの `kind` を見て表示を切り替える。
 */
import { EXIT_CODE } from './exit.ts';

/** エラーの分類。`error.tsx` はこれを見て表示を切り替える */
export type ErrorKind =
  | 'validation'
  | 'runtime'
  | 'stdin'
  | 'env'
  /** 認証が要る / 切れている (ADR 31) */
  | 'auth'
  /** 必要な外部コマンドが無い (ADR 31) */
  | 'missing-tool'
  /** 使い方の誤り全般 (端末が要る場面でパイプから呼ばれた、など) */
  | 'usage'
  | 'unknown';

export interface CliErrorOptions {
  kind?: ErrorKind;
  exitCode?: number;
  /** 検証の失敗など、複数の理由がある場合 */
  issues?: string[];
  /** 直し方。既定の表示では message の下に並ぶ (ADR 31) */
  hints?: string[];
  cause?: unknown;
}

/**
 * 出自ではなく印で見分ける (ADR 42)。
 * `Symbol.for` はグローバルな登録簿から引くので、decopin-cli が
 * node_modules に 2 つ入っても、realm が違っても同じ印になる。
 */
const CLI_ERROR = Symbol.for('decopin.CliError');

/**
 * 実行時のエラー。`kind` と `exitCode` を持つ。
 * 検証の失敗のように理由が複数ある場合は `issues` に並べる
 */
export class CliError extends Error {
  override readonly name = 'CliError';
  readonly [CLI_ERROR] = true;
  readonly kind: ErrorKind;
  readonly exitCode: number;
  readonly issues: string[];
  /** 直し方 (ADR 31) */
  readonly hints: string[];

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.kind = options.kind ?? 'runtime';
    this.exitCode = options.exitCode ?? EXIT_CODE.runtime;
    this.issues = options.issues ?? [];
    this.hints = options.hints ?? [];
  }
}

/** `error.tsx` / `global-error.tsx` が受け取る props */
export interface ErrorProps {
  /** `kind` で場合分けできる */
  error: CliError;
  /** 既定の終了コード。`<Exit code={n} />` で上書きできる */
  exitCode: number;
  argv: readonly string[];
  cwd: string;
}

/** 引数の検証に失敗した。使い方の誤りなので exit 2 */
export function validationError(issues: string[]): CliError {
  return new CliError(issues[0] ?? 'Invalid arguments', {
    kind: 'validation',
    exitCode: EXIT_CODE.usage,
    issues,
  });
}

/** {@link CliError} か。`instanceof` より広く当たる (ADR 42) */
export function isCliError(value: unknown): value is CliError {
  return (
    Error.isError(value) &&
    (value as { [CLI_ERROR]?: unknown })[CLI_ERROR] === true
  );
}
