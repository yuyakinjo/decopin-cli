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
 * パラメータ定義
 */
export interface ParamsDefinition {
  /** パラメータマッピングのリスト */
  mappings: ParamMapping[];
  /** valibotスキーマ */
  schema: v.GenericSchema;
}

/**
 * エラーハンドラーの型
 */
export type ErrorHandler = (error: ValidationError) => Promise<void> | void;

/**
 * パラメータ定義関数の型
 */
export type ParamsDefinitionFunction = () => ParamsDefinition;
