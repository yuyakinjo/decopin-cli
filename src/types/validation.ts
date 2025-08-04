import type * as v from 'valibot';
import type {
  CommandContext,
  EnvContext,
  ErrorContext,
  GlobalErrorContext,
  HelpContext,
  MiddlewareFactoryContext,
  ParamsContext,
  VersionContext,
} from './context.js';
import type { ValidationError } from './errors.js';
import type {
  EnvHandler,
  GlobalErrorHandler,
  HelpHandler,
  VersionHandler,
} from './handlers.js';
import type { MiddlewareHandler } from './middleware.js';

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
 * バリデーション関数の型
 */
// Re-export ValidationError from errors.ts
export type { ValidationError } from './errors.js';

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
/**
 * Handler factory function types that allow context parameter inference
 */
export interface ParamsHandlerFactory<E = typeof process.env> {
  (context: ParamsContext<E>): ParamsHandler;
  (): ParamsHandler;
}

export interface GlobalErrorHandlerFactory<E = typeof process.env> {
  (context: GlobalErrorContext<E>): GlobalErrorHandler;
  (): GlobalErrorHandler;
}

export interface EnvHandlerFactory<E = typeof process.env> {
  (context: EnvContext<E>): EnvHandler;
  (): EnvHandler;
}

export interface VersionHandlerFactory<E = typeof process.env> {
  (context: VersionContext<E>): VersionHandler;
  (): VersionHandler;
}

export interface HelpHandlerFactory<E = typeof process.env> {
  (context: HelpContext<E>): HelpHandler;
  (): HelpHandler;
}

export interface MiddlewareHandlerFactory<E = typeof process.env> {
  (context: MiddlewareFactoryContext<E>): MiddlewareHandler;
  (): MiddlewareHandler;
}

export interface ErrorHandlerFactory<T = unknown, E = typeof process.env> {
  (context: ErrorContext<T, E>): Promise<void> | void;
  (): Promise<void> | void;
}

export interface CommandHandlerFactory<T = unknown, E = typeof process.env> {
  (context: CommandContext<T, E>): Promise<void> | void;
  (): Promise<void> | void;
}
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
 * エラーハンドラーの型
 */
export type ErrorHandler<T = unknown, E = typeof process.env> =
  | ((context: ErrorContext<T, E>) => Promise<void> | void)
  | ((error: unknown) => Promise<void> | void);

/**
 * パラメータ定義関数の型
 */
export type ParamsDefinitionFunction<E = typeof process.env> =
  | ((context: ParamsContext<E>) => ParamsHandler)
  | (() => ParamsHandler);

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
}

/**
 * 環境変数定義関数の型
 */
export type EnvDefinitionFunction =
  | ((context: EnvContext<typeof process.env>) => EnvHandler)
  | (() => EnvHandler);
/**
 * バージョン情報のメタデータ
 */
export interface VersionMetadata {
  /** パッケージ名 */
  name?: string;
  /** バージョン番号 */
  version: string;
  /** 説明 */
  description?: string;
  /** 作成者 */
  author?: string;
  /** その他のメタデータ */
  [key: string]: unknown;
}

/**
 * バージョン定義関数の型
 */
export type VersionDefinitionFunction =
  | ((context: VersionContext<typeof process.env>) => VersionHandler)
  | (() => VersionHandler);
