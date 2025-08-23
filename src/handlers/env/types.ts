import type { EnvContext } from '../../types/context.js';
import type {
  EnvFieldSchema,
  EnvHandler,
  EnvHandlerFactory,
  EnvSchema,
  EnvValidationResult,
} from '../../types/validation.js';

/**
 * 環境変数ハンドラー関連の型定義
 */

/**
 * 環境変数ハンドラーのファクトリー関数型
 */
export type {
  EnvHandlerFactory,
  EnvHandler,
  EnvContext,
  EnvSchema,
  EnvFieldSchema,
  EnvValidationResult,
};

/**
 * 環境変数処理の結果
 */
export interface EnvProcessingResult<T = Record<string, unknown>> {
  /** 処理されたスキーマ */
  schema: EnvSchema;
  /** バリデーション結果 */
  validation: EnvValidationResult<T>;
  /** 使用されたコンテキスト */
  context: EnvContext;
  /** 処理が成功したかどうか */
  success: boolean;
  /** エラー情報（失敗時） */
  error?: unknown;
}

/**
 * 環境変数ハンドラーの実行オプション
 */
export interface EnvExecutionOptions<E = typeof process.env> {
  /** 環境変数ハンドラーファクトリー */
  factory: EnvHandlerFactory<E>;
  /** 実行コンテキスト */
  context: EnvContext<E>;
}

/**
 * 環境変数フィールドの型定義
 */
export type EnvFieldType = 'string' | 'number' | 'boolean';

/**
 * 環境変数の値の型
 */
export type EnvValue = string | number | boolean | undefined;

/**
 * 環境変数のバリデーションエラー
 */
export interface EnvValidationError {
  /** エラーが発生したフィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** 実際の値 */
  value: unknown;
  /** 期待される型 */
  expectedType: EnvFieldType;
}
