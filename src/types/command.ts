// 後方互換性のため、統合的に型を再エクスポート
// 新しいコードでは src/types/index.ts を使用することを推奨

export type {
  CommandContext,
  CommandHandler,
} from './context.js';
export type {
  CommandDefinition,
  CommandDefinitionFactory,
  DynamicParam,
  ParsedCommand,
} from './definition.js';

export type {
  CommandMetadata,
  HelpHandler,
} from './metadata.js';
export type {
  ErrorHandler,
  ParamMapping,
  ParamsDefinitionFunction,
  ParamsHandler,
  ValidationError,
  ValidationFunction,
  ValidationResult,
} from './validation.js';
