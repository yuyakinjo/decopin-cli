import type { ErrorContext } from '../../types/context.js';
import type {
  ErrorHandler,
  ErrorHandlerFactory,
} from '../../types/validation.js';

/**
 * エラーハンドラー関連の型定義
 */

/**
 * エラーハンドラーのファクトリー関数型
 */
export type { ErrorHandlerFactory, ErrorHandler, ErrorContext };

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
