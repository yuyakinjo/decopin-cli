import type { Context } from '../../types/context.js';
import type {
  ValidationError,
  ValidationResult,
} from '../../types/validation.js';

// 環境変数ハンドラー固有の型定義をここに移動

/**
 * 環境変数スキーマのタイプ定数
 */
export const SCHEMA_TYPE = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
} as const;

/**
 * 環境変数フィールドスキーマ定義
 */
export interface EnvFieldSchema {
  /** フィールドの型 */
  type: 'string' | 'number' | 'boolean';
  /** 必須フィールドかどうか */
  required?: boolean;
  /** デフォルト値 */
  default?: unknown;
  /** 数値の最小値 */
  min?: number;
  /** 数値の最大値 */
  max?: number;
  /** 文字列の最小長 */
  minLength?: number;
  /** 文字列の最大長 */
  maxLength?: number;
  /** 許可される値の列挙 */
  enum?: readonly (string | number)[];
  /** エラーメッセージ */
  errorMessage?: string;
}

/**
 * 環境変数スキーマ定義
 */
export interface EnvSchema {
  [envName: string]: EnvFieldSchema;
}

/**
 * 環境変数バリデーション結果
 */
export interface EnvValidationResult<T = Record<string, unknown>> {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** バリデーション成功時のデータ */
  data?: T;
  /** バリデーション失敗時のエラー */
  error?: ValidationError;
  /** バリデーション失敗時のエラー配列（後方互換性のため） */
  errors?: EnvValidationError[];
}

/**
 * 環境変数ハンドラー
 */
export type EnvHandler = EnvSchema;

/**
 * 環境変数定義関数の型
 */
export type EnvDefinitionFunction =
  | ((context: EnvContext<typeof process.env>) => EnvHandler)
  | (() => EnvHandler);

/**
 * 環境変数ハンドラー用のコンテキスト
 */
export type EnvContext<E = typeof process.env> = Context<E>;

/**
 * 環境変数ハンドラー関連の型定義
 */

/**
 * 環境変数ハンドラーのファクトリー関数型
 */
export interface EnvHandlerFactory<E = typeof process.env> {
  (context: EnvContext<E>): EnvHandler;
  (): EnvHandler;
}

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
