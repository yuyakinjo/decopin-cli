// 後方互換性のため、コマンド関連型を再エクスポート
// 新しいコードでは src/handlers/command/types.ts を使用することを推奨

export type {
  CommandDefinitionFactory,
  CommandMetadata,
  DynamicParam,
  ParsedCommand,
  RuntimeCommandDefinition,
} from '../handlers/command/types.js';
export type {
  CommandContext,
  CommandHandler,
} from './context.js';

export type {
  ValidationError,
  ValidationFunction,
  ValidationResult,
} from './validation.js';
