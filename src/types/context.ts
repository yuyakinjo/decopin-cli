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

// エラーハンドラー用のコンテキスト
export interface ErrorContext<T = unknown, E = unknown>
  extends CommandContext<T, E> {
  /** 発生したエラー */
  error: unknown;
}

// 特化された型エイリアス
export type Context<E = typeof process.env> = BaseCommandContext & {
  env: E;
};

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = never, E = never> =
  | ((context: CommandContext<T, E>) => Promise<void> | void)
  | (() => Promise<void> | void);

/**
 * グローバルエラーハンドラー用のコンテキスト
 * ファクトリー関数で使用
 */
export type GlobalErrorContext<E = typeof process.env> = Context<E>;

/**
 * 環境変数ハンドラー用のコンテキスト
 * ファクトリー関数で使用
 */
export type EnvContext<E = typeof process.env> = Context<E>;

/**
 * バージョンハンドラー用のコンテキスト
 * ファクトリー関数で使用
 */
export type VersionContext<E = typeof process.env> = Context<E>;

/**
 * ヘルプハンドラー用のコンテキスト
 * ファクトリー関数で使用
 */
export type HelpContext<E = typeof process.env> = Context<E>;

/**
 * パラメータハンドラー用のコンテキスト
 * ファクトリー関数で使用
 */
export type ParamsContext<E = typeof process.env> = Context<E>;

/**
 * ミドルウェア用のコンテキスト
 * 注: 実際のMiddlewareContext型はmiddleware.tsで定義されており、
 * これはファクトリー関数用のContext型エイリアスです
 */
export type MiddlewareFactoryContext<E = typeof process.env> = Context<E>;