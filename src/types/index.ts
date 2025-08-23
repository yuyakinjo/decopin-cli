// 共通型定義の統合エクスポート

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
