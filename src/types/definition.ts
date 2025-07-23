import type {
  CommandContext,
  CommandHandler,
  MiddlewareFunction,
} from './context.js';
import type { CommandMetadata } from './metadata.js';

/**
 * コマンド定義
 */
export interface CommandDefinition<T = unknown> {
  /** ミドルウェア関数（実行前に呼ばれる） */
  middleware?: MiddlewareFunction<T>[];
  /** コマンドハンドラー */
  handler: CommandHandler<T>;
}

/**
 * コマンド定義ファクトリーの型
 */
export type CommandDefinitionFactory<T = unknown> = (
  context: CommandContext<T>
) => CommandDefinition<T>;

/**
 * コマンド定義関数の型
 */
export type CommandDefinitionFunction<T = unknown> = () => CommandDefinition<T>;

/**
 * 動的パラメータ
 */
export interface DynamicParam {
  /** パラメータ名 */
  name: string;
  /** オプショナルかどうか */
  optional: boolean;
}

/**
 * 解析済みコマンド（help.tsからのmetadataを含む）
 */
export interface ParsedCommand<T = unknown> {
  /** コマンドパス（例: 'user/create'） */
  path: string;
  /** パスセグメント（例: ['user', 'create']） */
  segments: string[];
  /** 動的パラメータ */
  dynamicParams: DynamicParam[];
  /** command.tsファイルのパス */
  filePath: string;
  /** コマンド定義（help.tsからのmetadataを含む） */
  definition: CommandDefinition<T> & { metadata?: CommandMetadata };
}
