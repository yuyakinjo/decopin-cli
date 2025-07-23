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
