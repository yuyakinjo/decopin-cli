// 共通型定義の統合エクスポート

// ハンドラー固有の型定義
// Command handler
export type {
  CommandDefinitionFactory,
  CommandGenerator,
  CommandHandlerFactory,
  CommandMetadata,
  CommandParser,
  DynamicParam,
  GeneratedCode,
  ParsedCommand,
  ParsedCommandDefinition,
  RuntimeCommandDefinition,
} from '../handlers/command/types.js';
// Env handler
export type {
  EnvContext,
  EnvExecutionOptions,
  EnvFieldSchema,
  EnvHandler,
  EnvHandlerFactory,
  EnvProcessingResult,
  EnvSchema,
  EnvValidationError,
  EnvValidationResult,
  EnvValue,
} from '../handlers/env/types.js';
export { SCHEMA_TYPE } from '../handlers/env/types.js';
// Error handler
export type {
  ErrorContext,
  ErrorExecutionOptions,
  ErrorHandler,
  ErrorHandlerFactory,
  ErrorProcessingResult,
  ErrorTypeGuards,
} from '../handlers/error/types.js';
// Global error handler
export type {
  ErrorDisplayOptions,
  GlobalErrorContext,
  GlobalErrorExecutionOptions,
  GlobalErrorHandler,
  GlobalErrorHandlerFactory,
  GlobalErrorProcessingResult,
  GlobalErrorTypeGuards,
} from '../handlers/global-error/types.js';
// Help handler
export type {
  HelpContext,
  HelpExecutionOptions,
  HelpHandler,
  HelpProcessingResult,
} from '../handlers/help/types.js';
// Middleware handler
export type {
  MiddlewareContext,
  MiddlewareExecutionOptions,
  MiddlewareFactory,
  MiddlewareFactoryContext,
  MiddlewareHandler,
  MiddlewareHandlerFactory,
  MiddlewareProcessingResult,
  NextFunction,
} from '../handlers/middleware/types.js';

// Params handler
export type {
  ManualFieldSchema,
  ManualSchema,
  ParamMapping,
  ParamsContext,
  ParamsHandler,
} from '../handlers/params/types.js';
// Version handler
export type {
  VersionComparisonResult,
  VersionContext,
  VersionDisplayOptions,
  VersionExecutionOptions,
  VersionHandler,
  VersionHandlerFactory,
  VersionProcessingResult,
} from '../handlers/version/types.js';
// 実行コンテキスト関連（共通）
export type {
  BaseCommandContext,
  CommandContext,
  CommandHandler,
  Context,
} from './context.js';
// エラー型定義（共通）
export type {
  CLIError,
  ModuleError,
  ValidationError,
  ValidationIssue,
} from './errors.js';
export {
  formatError,
  hasStackTrace,
  isModuleError,
  isValidationError,
} from './errors.js';
// ハンドラーレジストリ（共通）
export type {
  HandlerDefinition,
  HandlerRegistryMap,
  HandlerScope,
} from './handler-registry.js';
export {
  createHandlerRegistryMap,
  EXECUTION_ORDER,
  getHandlersByExecutionOrder,
  getHandlersByScope,
  HANDLER_REGISTRY,
  validateHandlerDependencies,
} from './handler-registry.js';
// バリデーション関連（共通）
export type {
  ValidationFunction,
  ValidationResult,
} from './validation.js';
