// 後方互換性のため、統合的に型を再エクスポート
// 新しいコードでは src/types/index.ts を使用することを推奨

export type {
  CommandContext,
  CommandHandler,
} from './context.js';
export type {
  CommandDefinition,
  CommandDefinitionFactory,
  CommandDefinitionFunction,
  DynamicParam,
  ParsedCommand,
} from './definition.js';

export type {
  CommandHelpMetadata,
  CommandMetadata,
} from './metadata.js';
export type {
  ErrorHandler,
  ParamMapping,
  ParamsDefinition,
  ParamsDefinitionFunction,
  ValidationError,
  ValidationFunction,
  ValidationResult,
} from './validation.js';
