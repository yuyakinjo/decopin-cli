/**
 * 実行時のエラー分類。
 * `error.tsx` (Phase 4) はこの `kind` を見て表示を切り替える。
 */
import { EXIT_CODE } from './exit.ts';

export type ErrorKind = 'validation' | 'runtime' | 'stdin' | 'env' | 'unknown';

export interface CliErrorOptions {
  kind?: ErrorKind;
  exitCode?: number;
  /** 検証の失敗など、複数の理由がある場合 */
  issues?: string[];
  cause?: unknown;
}

export class CliError extends Error {
  override readonly name = 'CliError';
  readonly kind: ErrorKind;
  readonly exitCode: number;
  readonly issues: string[];

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.kind = options.kind ?? 'runtime';
    this.exitCode = options.exitCode ?? EXIT_CODE.runtime;
    this.issues = options.issues ?? [];
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
