// 型定義の統合エクスポート

// 実行コンテキスト関連
export type {
  BaseCommandContext,
  CommandContext,
  CommandHandler,
} from './context.js';

// コマンド定義関連
export type {
  CommandDefinition,
  CommandDefinitionFactory,
  DynamicParam,
  ParsedCommand,
} from './definition.js';

// メタデータ関連
export type {
  CommandMetadata,
  HelpHandler,
} from './metadata.js';

// バリデーション関連（valibotのみ）
export type {
  ErrorHandler,
  ParamMapping,
  ParamsDefinitionFunction,
  ParamsHandler,
  ValidationError,
  ValidationFunction,
  ValidationResult,
} from './validation.js';

// エラー型定義
export type {
  CLIError,
  ValidationError as CLIValidationError,
  ModuleError,
  ValidationIssue,
} from './errors.js';

export {
  isValidationError,
  isModuleError,
  hasStackTrace,
  formatError,
} from './errors.js';

// グローバルエラーハンドラー
import type { CLIError } from './errors.js';
export type GlobalErrorHandler = (error: CLIError) => Promise<void> | void;

// ミドルウェア関連
export type {
  MiddlewareContext,
  NextFunction,
  MiddlewareHandler,
  MiddlewareFactory,
  MiddlewareExport,
} from './middleware.js';
