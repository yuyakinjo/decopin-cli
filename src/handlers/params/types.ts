import type * as v from 'valibot';
import type { ValidationError } from '../../types/errors.js';

/**
 * パラメータバリデーション結果
 */
export interface ParamValidationResult<T = unknown> {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** バリデーション成功時のデータ */
  data?: T;
  /** バリデーション失敗時のエラー */
  error?: ValidationError;
}

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
  /** フィールドの型（基本的なバリデーション用） */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 必須フィールドかどうか */
  required?: boolean;
  /** フィールドの説明（ヘルプ表示用） */
  description?: string;
  /** 追加のバリデーション（例: 'email', 'url'） */
  validation?: 'email' | 'url';
}

/**
 * マニュアルフィールドスキーマ定義
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
 * マニュアルスキーマ定義
 */
export interface ManualSchema {
  [fieldName: string]: ManualFieldSchema;
}

/**
 * パラメータハンドラー定義
 */
export type ParamsHandler =
  | {
      /** 明示的なvalibotスキーマを使用 */
      schema: v.GenericSchema | ManualSchema;
      mappings?: never;
    }
  | {
      /** mappingsから自動的にスキーマを生成 */
      mappings: ParamMapping[];
      schema?: never;
    }
  | {
      /** 手動スキーマとマッピングを組み合わせて使用 */
      schema: ManualSchema;
      mappings: ParamMapping[];
    };

/**
 * パラメータバリデーション関数の型
 */
export type ParamValidationFunction = (
  args: string[],
  options: Record<string, string | boolean>,
  params: Record<string, string>
) => Promise<ParamValidationResult> | ParamValidationResult;

/**
 * パラメータ処理コンテキスト
 */
export interface ParamProcessingContext {
  /** コマンドライン引数 */
  args: string[];
  /** パースされたオプション */
  options: Record<string, string | boolean>;
  /** 追加のパラメータ */
  params: Record<string, string>;
  /** パラメータハンドラー定義 */
  paramsDefinition: ParamsHandler;
}

/**
 * パラメータ抽出結果
 */
export interface ParamExtractionResult {
  /** 抽出されたデータ */
  data: Record<string, unknown>;
  /** 抽出に使用されたマッピング情報 */
  mappings?: ParamMapping[];
}
