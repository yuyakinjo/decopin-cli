// 型定義の統合エクスポート

// 実行コンテキスト関連
export type {
  CommandContext,
  CommandHandler,
  MiddlewareFunction,
} from './context.js';
// コマンド定義関連
export type {
  CommandDefinition,
  CommandDefinitionFactory,
  CommandDefinitionFunction,
  DynamicParam,
  ParsedCommand,
} from './definition.js';

// メタデータ関連
export type {
  CommandHelpMetadata,
  CommandMetadata,
  CommandSchema,
} from './metadata.js';
// バリデーション関連
export type {
  ErrorHandler,
  ParamMapping,
  ParamsDefinition,
  ParamsDefinitionFunction,
  ValidationError,
  ValidationFunction,
  ValidationResult,
} from './validation.js';
