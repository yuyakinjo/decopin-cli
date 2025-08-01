import type * as v from 'valibot';
import type { BaseContext, ErrorContext } from './context.js';

/**
 * バリデーション結果
 */
export interface ValidationResult<T = unknown> {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** バリデーション成功時のデータ */
  data?: T;
  /** バリデーション失敗時のエラー */
  error?: ValidationError;
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  /** エラーメッセージ */
  message: string;
  /** フィールド固有のエラー */
  issues?: Array<{
    path: string[];
    message: string;
  }>;
}

/**
 * バリデーション関数の型
 */
export type ValidationFunction = (
  args: string[],
  options: Record<string, string | boolean>,
  params: Record<string, string>
) => Promise<ValidationResult> | ValidationResult;

/**
 * パラメータマッピング定義
 */
export interface ParamMapping {
  /** マッピング先のフィールド名 */
  field: string;
  /** 位置引数のインデックス（0始まり） */
  argIndex?: number;
  /** オプション名（--name形式） */
  option?: string;
  /** デフォルト値 */
  defaultValue?: unknown;
}

/**
 * オブジェクトベースのフィールドスキーマ定義
 */
export interface ManualFieldSchema {
  /** フィールドの型 */
  type: 'string' | 'number' | 'boolean';
  /** 必須フィールドかどうか */
  required?: boolean;
  /** デフォルト値 */
  defaultValue?: unknown;
  /** 数値の最小値 */
  minValue?: number;
  /** 数値の最大値 */
  maxValue?: number;
  /** 文字列の最小長 */
  minLength?: number;
  /** 文字列の最大長 */
  maxLength?: number;
  /** 許可される値の列挙 */
  enum?: readonly (string | number)[];
  /** カスタム変換関数 */
  transform?: (value: unknown) => unknown;
  /** カスタムバリデーション関数 */
  validate?: (value: unknown) => string | null; // エラーメッセージまたはnull
}

/**
 * オブジェクトベースのスキーマ定義
 */
export interface ManualSchema {
  [fieldName: string]: ManualFieldSchema;
}

/**
 * パラメータ定義（valibotスキーマとオブジェクトベースの両方をサポート）
 */
export interface ParamsHandler {
  /** valibotスキーマまたはオブジェクトベースのスキーマ */
  schema: v.GenericSchema | ManualSchema;
  /** パラメータマッピング */
  mappings: ParamMapping[];
}

/**
 * エラーハンドラーの型
 */
export type ErrorHandler<T = unknown, E = typeof process.env> = (
  context: ErrorContext<T, E>
) => Promise<void> | void;

/**
 * パラメータ定義関数の型
 */
export type ParamsDefinitionFunction<E = typeof process.env> = (
  context: BaseContext<E>
) => ParamsHandler;

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
 * 環境変数ハンドラー
 */
export type EnvHandler = EnvSchema;

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
}

/**
 * 環境変数定義関数の型
 */
export type EnvDefinitionFunction = () => EnvHandler;
