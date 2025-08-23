import type { GlobalErrorContext } from '../../types/context.js';
import type { CLIError } from '../../types/errors.js';
import type {
  GlobalErrorHandler,
  GlobalErrorHandlerFactory,
} from '../../types/validation.js';

/**
 * グローバルエラーハンドラー関連の型定義
 */

/**
 * グローバルエラーハンドラーのファクトリー関数型
 */
export type {
  GlobalErrorHandlerFactory,
  GlobalErrorHandler,
  GlobalErrorContext,
  CLIError,
};

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
