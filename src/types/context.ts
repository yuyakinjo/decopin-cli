/**
 * 基本的なコマンドコンテキスト（params.tsなし）
 */
interface BaseCommandContext {
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
 * バリデーション済みコマンドコンテキスト（params.tsあり）
 */
interface ValidatedCommandContext<T> extends BaseCommandContext {
  /** バリデーション済みデータ（必須） */
  validatedData: T;
}

/**
 * コマンドの実行コンテキスト
 * - params.tsがない場合: CommandContext (型引数なし)
 * - params.tsがある場合: CommandContext<T> (型引数あり)
 */
export type CommandContext<T = never> = T extends never
  ? BaseCommandContext
  : ValidatedCommandContext<T>;

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = never> = (
  context: CommandContext<T>
) => Promise<void> | void;

/**
 * ミドルウェア関数の型
 */
export type MiddlewareFunction<T = never> = (
  context: CommandContext<T>,
  next: () => Promise<void> | void
) => Promise<void> | void;
