/**
 * コマンドのメタデータ
 */
export interface CommandMetadata {
  /** コマンドの名前 */
  name?: string;
  /** コマンドの説明 */
  description?: string;
  /** 使用例 */
  examples?: string[];
  /** エイリアス */
  aliases?: string[];
}

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
 * コマンドの引数とオプションの定義
 */
export interface CommandSchema {
  /** 位置引数のスキーマ */
  args?: unknown;
  /** オプション引数のスキーマ */
  options?: unknown;
}

/**
 * コマンドの実行コンテキスト
 */
export interface CommandContext<T = unknown> {
  /** 解析された引数 */
  args: unknown[];
  /** 解析されたオプション */
  options: Record<string, unknown>;
  /** 動的パラメータ（[id]など） */
  params: Record<string, string>;
  /** バリデーション済みのデータ */
  validatedData?: T;
  /** ヘルプテキスト表示関数 */
  showHelp: () => void;
}

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = unknown> = (
  context: CommandContext<T>
) => Promise<void> | void;

/**
 * ミドルウェア関数の型
 */
export type MiddlewareFunction<T = unknown> = (
  context: CommandContext<T>,
  next: () => Promise<void> | void
) => Promise<void> | void;

/**
 * バリデーション関数の型
 */
export type ValidationFunction = (
  args: unknown[],
  options: Record<string, unknown>,
  params: Record<string, string>
) => Promise<ValidationResult> | ValidationResult;

/**
 * パラメータのマッピング定義
 */
export interface ParamMapping {
  /** フィールド名 */
  field: string;
  /** オプション名（--name など） */
  option?: string;
  /** 位置引数のインデックス */
  argIndex?: number;
  /** デフォルト値 */
  defaultValue?: unknown;
}

/**
 * パラメータの定義
 */
export interface ParamsDefinition {
  /** valibotのschema */
  schema: unknown;
  /** パラメータのマッピング */
  mappings: ParamMapping[];
}

/**
 * エラーハンドラーの型
 */
export type ErrorHandler = (error: ValidationError) => Promise<void> | void;

/**
 * command.tsファイルでエクスポートすべき型
 */
export interface CommandDefinition<T = unknown> {
  /** コマンドのメタデータ */
  metadata?: CommandMetadata;
  /** 引数とオプションのスキーマ */
  schema?: CommandSchema;
  /** ミドルウェア関数 */
  middleware?: MiddlewareFunction<T>[];
  /** メインのハンドラー関数 */
  handler: CommandHandler<T>;
}

/**
 * command.tsファイルの関数形式のexport
 */
export type CommandDefinitionFunction<T = unknown> = () => CommandDefinition<T>;

/**
 * params.tsファイルの関数形式のexport
 */
export type ParamsDefinitionFunction = () => ParamsDefinition;

/**
 * 動的パラメータ情報
 */
export interface DynamicParam {
  /** パラメータ名 */
  name: string;
  /** オプショナルかどうか */
  optional: boolean;
}

/**
 * 解析されたコマンド情報
 */
export interface ParsedCommand<T = unknown> {
  /** コマンドパス（例: 'user/create'） */
  path: string;
  /** セグメント（例: ['user', 'create']） */
  segments: string[];
  /** 動的パラメータ */
  dynamicParams: DynamicParam[];
  /** ファイルパス */
  filePath: string;
  /** コマンド定義 */
  definition: CommandDefinition<T>;
  /** バリデーション関数 */
  validate?: ValidationFunction;
  /** エラーハンドラー */
  errorHandler?: ErrorHandler;
}
