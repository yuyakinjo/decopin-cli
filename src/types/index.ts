// 型定義の統合エクスポート

// 実行コンテキスト関連
export type {
  BaseCommandContext,
  BaseContext,
  CommandContext,
  CommandHandler,
  Context,
  ErrorContext,
} from './context.js';

// コマンド定義関連
export type {
  CommandDefinition,
  CommandDefinitionFactory,
  DynamicParam,
  ParsedCommand,
} from './definition.js';
// エラー型定義
export type {
  CLIError,
  ModuleError,
  ValidationError as CLIValidationError,
  ValidationIssue,
} from './errors.js';
export {
  formatError,
  hasStackTrace,
  isModuleError,
  isValidationError,
} from './errors.js';
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
  EnvHandler,
  EnvDefinitionFunction,
  VersionHandler,
  VersionDefinitionFunction,
} from './validation.js';

import type { Context } from './context.js';
// グローバルエラーハンドラー
import type { CLIError } from './errors.js';
export type GlobalErrorHandler = (error: CLIError) => Promise<void> | void;
export type GlobalErrorHandlerFactory<E = typeof process.env> = 
  | ((context: Context<E>) => GlobalErrorHandler)
  | (() => GlobalErrorHandler);

// ミドルウェア関連
export type {
  MiddlewareContext,
  MiddlewareExport,
  MiddlewareFactory,
  MiddlewareHandler,
  NextFunction,
} from './middleware.js';
