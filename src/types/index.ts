// 型定義の統合エクスポート

// 実行コンテキスト関連
export type {
  BaseCommandContext,
  BaseContext,
  CommandContext,
  CommandHandler,
  Context,
  EnvContext,
  ErrorContext,
  GlobalErrorContext,
  HelpContext,
  MiddlewareFactoryContext,
  ParamsContext,
  VersionContext,
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
// ハンドラー関連
export type {
  EnvHandler,
  GlobalErrorHandler,
  HelpHandler,
  VersionHandler,
} from './handlers.js';
// メタデータ関連
export type { CommandMetadata } from './metadata.js';
// ミドルウェア関連
export type {
  MiddlewareContext,
  MiddlewareExport,
  MiddlewareFactory,
  MiddlewareHandler,
  NextFunction,
} from './middleware.js';
// バリデーション関連（valibotのみ）
export type {
  CommandHandlerFactory,
  EnvDefinitionFunction,
  EnvHandlerFactory,
  ErrorHandler,
  ErrorHandlerFactory,
  GlobalErrorHandlerFactory,
  HelpHandlerFactory,
  MiddlewareHandlerFactory,
  ParamMapping,
  ParamsDefinitionFunction,
  ParamsHandler,
  // Factory types with inference
  ParamsHandlerFactory,
  ValidationError,
  ValidationFunction,
  ValidationResult,
  VersionDefinitionFunction,
  VersionHandlerFactory,
} from './validation.js';
export { SCHEMA_TYPE } from './validation.js';
