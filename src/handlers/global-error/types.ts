import type { Context } from '../../types/context.js';
import type { CLIError } from '../../types/errors.js';

// グローバルエラーハンドラー固有の型定義をここに移動

/**
 * グローバルエラーハンドラー
 */
export type GlobalErrorHandler = (
  error: CLIError | unknown
) => Promise<void> | void;

/**
 * グローバルエラーハンドラー用のコンテキスト
 */
export type GlobalErrorContext<E = typeof process.env> = Context<E>;

/**
 * グローバルエラーハンドラー関連の型定義
 */

/**
 * グローバルエラーハンドラーのファクトリー関数型
 */
export interface GlobalErrorHandlerFactory<E = typeof process.env> {
  (context: GlobalErrorContext<E>): GlobalErrorHandler;
  (): GlobalErrorHandler;
}

/**
 * グローバルエラー処理の結果
 */
export interface GlobalErrorProcessingResult {
  /** エラーが処理されたかどうか */
  handled: boolean;
  /** 処理されたエラー */
  error: unknown;
  /** 使用されたコンテキスト */
  context: GlobalErrorContext;
  /** 処理時間（ミリ秒） */
  processingTime: number;
  /** 処理中に発生したエラー（ハンドラー自体のエラー） */
  handlerError?: unknown;
}

/**
 * グローバルエラーハンドラーの実行オプション
 */
export interface GlobalErrorExecutionOptions<E = typeof process.env> {
  /** グローバルエラーハンドラーファクトリー */
  factory: GlobalErrorHandlerFactory<E>;
  /** 実行コンテキスト */
  context: GlobalErrorContext<E>;
  /** 発生したエラー */
  error: unknown;
}

/**
 * エラーの種類を判定するためのタイプガード
 */
export interface GlobalErrorTypeGuards {
  /** バリデーションエラーかどうか */
  isValidationError: (error: unknown) => boolean;
  /** CLIエラーかどうか */
  isCLIError: (error: unknown) => boolean;
  /** モジュールエラーかどうか */
  isModuleError: (error: unknown) => boolean;
  /** システムエラーかどうか */
  isSystemError: (error: unknown) => boolean;
  /** スタックトレースを持つエラーかどうか */
  hasStackTrace: (error: unknown) => boolean;
}

/**
 * エラー表示のオプション
 */
export interface ErrorDisplayOptions {
  /** 詳細情報を表示するかどうか */
  verbose?: boolean;
  /** スタックトレースを表示するかどうか */
  showStackTrace?: boolean;
  /** カラー出力を使用するかどうか */
  useColors?: boolean;
  /** JSON形式で出力するかどうか */
  json?: boolean;
}
