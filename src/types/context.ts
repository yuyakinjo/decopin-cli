/**
 * コマンドの実行コンテキスト
 */
export interface CommandContext<T = unknown> {
  /** 位置引数 */
  args: string[];
  /** オプション引数 */
  options: Record<string, string | boolean>;
  /** 動的パラメータ */
  params: Record<string, string>;
  /** ヘルプ表示関数 */
  showHelp: () => void;
  /** バリデーション済みデータ（存在する場合） */
  validatedData?: T;
}

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = unknown> = (
  context: CommandContext<T>
) => Promise<void> | void;

/**
 * ミドルウェア関数の型
 */
export type MiddlewareFunction<T = unknown> = (
  context: CommandContext<T>,
  next: () => Promise<void> | void
) => Promise<void> | void;
