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
 * バリデーション済みコマンドコンテキスト（params.tsあり）
 */
interface ValidatedCommandContext<T> extends BaseContextProperties {
  /** バリデーション済みデータ（必須） */
  validatedData: T;
  /** 型安全な環境変数 */
  env: Record<string, unknown>;
}

/**
 * 環境変数付きコマンドコンテキスト
 */
interface EnvCommandContext<E> extends BaseContextProperties {
  /** 型安全な環境変数 */
  env: E;
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
 * @deprecated Use `Context` instead. Will be removed in v1.0.0.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import type { BaseContext } from 'decopin-cli';
 * function myFunc(context: BaseContext<MyEnv>) { ... }
 *
 * // After
 * import type { Context } from 'decopin-cli';
 * function myFunc(context: Context<MyEnv>) { ... }
 * ```
 */
export type BaseContext<E = typeof process.env> = Context<E>;

/**
 * @deprecated Use `CommandContext` with generic parameters instead. Will be removed in v1.0.0.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import type { ValidatedContext } from 'decopin-cli';
 * function myFunc(context: ValidatedContext<MyData>) { ... }
 *
 * // After
 * import type { CommandContext } from 'decopin-cli';
 * function myFunc(context: CommandContext<MyData>) { ... }
 * ```
 */
export type ValidatedContext<T> = ValidatedCommandContext<T>;

/**
 * @deprecated Use `Context` instead. Will be removed in v1.0.0.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import type { EnvContext } from 'decopin-cli';
 * function myFunc(context: EnvContext<MyEnv>) { ... }
 *
 * // After
 * import type { Context } from 'decopin-cli';
 * function myFunc(context: Context<MyEnv>) { ... }
 * ```
 */
export type EnvContext<E> = EnvCommandContext<E>;

/**
 * コマンドハンドラーの型
 */
export type CommandHandler<T = never, E = never> = (
  context: CommandContext<T, E>
) => Promise<void> | void;
