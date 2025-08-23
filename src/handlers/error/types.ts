import type { CommandContext } from '../../types/context.js';

// エラーハンドラー固有の型定義をここに移動

/**
 * エラーハンドラー用のコンテキスト
 */
export interface ErrorContext<T = unknown, E = unknown>
  extends CommandContext<T, E> {
  /** 発生したエラー */
  error: unknown;
}

/**
 * エラーハンドラーの型
 */
export type ErrorHandler<T = unknown, E = typeof process.env> =
  | ((context: ErrorContext<T, E>) => Promise<void> | void)
  | ((error: unknown) => Promise<void> | void);

/**
 * エラーハンドラー関連の型定義
 */

/**
 * エラーハンドラーのファクトリー関数型
 */
export type ErrorHandlerFactory<T = unknown, E = typeof process.env> =
  | ((context: ErrorContext<T, E>) => Promise<void> | void)
  | (() => Promise<void> | void);

/**
 * エラー処理の結果
 */
export interface ErrorProcessingResult {
  /** エラーが処理されたかどうか */
  handled: boolean;
  /** 処理されたエラー */
  error: unknown;
  /** 使用されたコンテキスト */
  context?: ErrorContext;
  /** 処理時間（ミリ秒） */
  processingTime: number;
}

/**
 * エラーハンドラーの実行オプション
 */
export interface ErrorExecutionOptions<T = unknown, E = typeof process.env> {
  /** エラーハンドラーファクトリー */
  factory: ErrorHandlerFactory<T, E>;
  /** 実行コンテキスト */
  context: ErrorContext<T, E>;
  /** 発生したエラー */
  error: unknown;
}

/**
 * エラーの種類を判定するためのタイプガード
 */
export interface ErrorTypeGuards {
  /** バリデーションエラーかどうか */
  isValidationError: (error: unknown) => boolean;
  /** CLIエラーかどうか */
  isCLIError: (error: unknown) => boolean;
  /** システムエラーかどうか */
  isSystemError: (error: unknown) => boolean;
}
