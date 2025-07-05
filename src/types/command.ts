/**
 * コマンドのメタデータ
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
}

/**
 * コマンドの引数とオプションの定義
 */
export interface CommandSchema {
  /** 位置引数のスキーマ */
  args?: unknown;
  /** オプション引数のスキーマ */
  options?: unknown;
}

/**
 * コマンドの実行コンテキスト
 */
export interface CommandContext {
  /** 解析された引数 */
  args: Record<string, any>;
  /** 解析されたオプション */
  options: Record<string, any>;
  /** 動的パラメータ（[id]など） */
  params: Record<string, string>;
  /** ヘルプテキスト表示関数 */
  showHelp: () => void;
}

/**
 * コマンドハンドラーの型
 */
export type CommandHandler = (context: CommandContext) => Promise<void> | void;

/**
 * ミドルウェア関数の型
 */
export type MiddlewareFunction = (
  context: CommandContext,
  next: () => Promise<void> | void
) => Promise<void> | void;

/**
 * command.tsファイルでエクスポートすべき型
 */
export interface CommandDefinition {
  /** コマンドのメタデータ */
  metadata?: CommandMetadata;
  /** 引数とオプションのスキーマ */
  schema?: CommandSchema;
  /** ミドルウェア関数 */
  middleware?: MiddlewareFunction[];
  /** メインのハンドラー関数 */
  handler: CommandHandler;
}

/**
 * 動的パラメータ情報
 */
export interface DynamicParam {
  /** パラメータ名 */
  name: string;
  /** オプショナルかどうか */
  optional: boolean;
}

/**
 * 解析されたコマンド情報
 */
export interface ParsedCommand {
  /** コマンドパス（例: 'user/create'） */
  path: string;
  /** セグメント（例: ['user', 'create']） */
  segments: string[];
  /** 動的パラメータ */
  dynamicParams: DynamicParam[];
  /** ファイルパス */
  filePath: string;
  /** コマンド定義 */
  definition: CommandDefinition;
}
