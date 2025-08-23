/**
 * 基本的なコマンドコンテキストの共通プロパティ
 */
interface BaseContextProperties {
  /** 位置引数 */
  args: string[];
  /** オプション引数 */
  options: Record<string, string | boolean>;
  /** 動的パラメータ */
  params: Record<string, string>;
  /** ヘルプ表示関数 */
  showHelp: () => void;
}

/**
 * 基本的なコマンドコンテキスト（params.ts・env.tsなし）
 */
export interface BaseCommandContext extends BaseContextProperties {
  /** 型安全な環境変数 */
  env: Record<string, unknown>;
}

/**
 * コマンドの実行コンテキスト（関数オーバーロード型定義）
 */
export interface CommandContext<T = unknown, E = unknown>
  extends BaseContextProperties {
  /** バリデーション済みデータ（params.tsがある場合のみ） */
  validatedData: T;
  /** 型安全な環境変数 */
  env: E extends unknown ? E : Record<string, unknown>;
}

// 共通コンテキスト型エイリアス
export type Context<E = typeof process.env> = BaseCommandContext & {
  env: E;
};

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = never, E = never> =
  | ((context: CommandContext<T, E>) => Promise<void> | void)
  | (() => Promise<void> | void);
