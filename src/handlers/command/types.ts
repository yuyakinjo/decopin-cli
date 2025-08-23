import type { CLIStructure } from '../../core/types.js';
import type { CommandContext, CommandHandler } from '../../types/context.js';

/**
 * コマンドパーサーインターフェース
 */
export interface CommandParser {
  parse(content: string, filePath: string): Promise<ParsedCommandDefinition>;
  validate(definition: ParsedCommandDefinition): ValidationResult;
}

/**
 * コマンドジェネレーターインターフェース
 */
export interface CommandGenerator {
  generate(
    commands: ParsedCommandDefinition[],
    structure?: CLIStructure
  ): Promise<GeneratedCode>;
  createImports(commands: ParsedCommandDefinition[]): string[];
}

/**
 * 解析済みコマンド定義（スキャナーで使用）
 */
export interface ParsedCommandDefinition {
  name: string;
  path: string;
  description?: string;
  metadata?: CommandMetadata;
  hasParams: boolean;
  hasHelp: boolean;
  hasError: boolean;
}

/**
 * ランタイムコマンド定義（実行時に使用）
 */
export interface RuntimeCommandDefinition<T = unknown> {
  /** コマンドハンドラー */
  handler: CommandHandler<T>;
}

/**
 * コマンド定義ファクトリーの型
 */
export type CommandDefinitionFactory<T = unknown> = CommandHandler<T>;

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
  definition: RuntimeCommandDefinition<T> & { metadata?: CommandMetadata };
}

/**
 * コマンドメタデータ
 */
export interface CommandMetadata {
  /** コマンドの名前 */
  name?: string;
  /** コマンドの説明 */
  description?: string;
  /** 使用例 */
  examples?: string[];
  /** エイリアス */
  aliases?: string[];
  /** 追加のヘルプ情報 */
  additionalHelp?: string;
  /** バージョン */
  version?: string;
  /** 使用方法 */
  usage?: string;
}

/**
 * 生成されたコード
 */
export interface GeneratedCode {
  content: string;
  imports: string[];
  types?: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * コマンドハンドラーファクトリー
 */
export interface CommandHandlerFactory<T = unknown, E = typeof process.env> {
  (context: CommandContext<T, E>): Promise<void> | void;
  (): Promise<void> | void;
}

/**
 * コマンド定義（テスト用）
 */
export interface CommandDefinition<T = unknown> {
  /** コマンド名 */
  name: string;
  /** コマンドパス */
  path: string;
  /** コマンドハンドラー */
  handler: CommandHandler<T>;
  /** メタデータ */
  metadata?: CommandMetadata;
}

/**
 * コマンドハンドラーインターフェース（テスト用）
 */
export interface CommandHandlerInterface {
  /** コマンドを実行する */
  execute: (context: any, args: string[], options: any) => Promise<void>;
}
