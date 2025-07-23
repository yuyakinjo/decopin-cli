import type * as v from 'valibot';

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
export interface ParamsDefinition {
  /** valibotスキーマまたはオブジェクトベースのスキーマ */
  schema: v.GenericSchema | ManualSchema;
  /** パラメータマッピング */
  mappings: ParamMapping[];
}

/**
 * エラーハンドラーの型
 */
export type ErrorHandler = (error: ValidationError) => Promise<void> | void;

/**
 * パラメータ定義関数の型
 */
export type ParamsDefinitionFunction = () => ParamsDefinition;
