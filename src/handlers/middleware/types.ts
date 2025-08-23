import type { Context } from '../../types/context.js';

// ミドルウェアハンドラー固有の型定義をここに移動

/**
 * ミドルウェアコンテキスト
 */
export interface MiddlewareContext<
  Env extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> {
  /** Command path (e.g., ['user', 'create']) */
  command: string[];
  /** Parsed command line arguments */
  args: string[];
  /** Parsed command line options */
  options: Record<string, string | boolean>;
  /** Environment variables */
  env: Env;
}

/**
 * Function to proceed to the next middleware or command
 */
export type NextFunction = () => Promise<void> | void;

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  context: MiddlewareContext,
  next: NextFunction
) => Promise<void> | void;

/**
 * ミドルウェアファクトリー用のコンテキスト
 */
export type MiddlewareFactoryContext<E = typeof process.env> = Context<E>;

/**
 * Middleware factory function (exported from middleware.ts)
 */
export type MiddlewareFactory<E = typeof process.env> =
  | ((context: MiddlewareFactoryContext<E>) => MiddlewareHandler)
  | (() => MiddlewareHandler);

/**
 * Middleware export structure
 */
export interface MiddlewareExport {
  default: MiddlewareFactory;
}

/**
 * ミドルウェアハンドラー関連の型定義
 */

/**
 * ミドルウェアハンドラーのファクトリー関数型
 */
export interface MiddlewareHandlerFactory<E = typeof process.env> {
  (context: MiddlewareFactoryContext<E>): MiddlewareHandler;
  (): MiddlewareHandler;
}

/**
 * ミドルウェア処理の結果
 */
export interface MiddlewareProcessingResult {
  /** ミドルウェアが正常に実行されたかどうか */
  success: boolean;
  /** 実行されたミドルウェアハンドラー */
  handler: MiddlewareHandler;
  /** 使用されたコンテキスト */
  context: MiddlewareFactoryContext;
  /** 処理時間（ミリ秒） */
  processingTime: number;
  /** エラー情報（失敗時） */
  error?: unknown;
}

/**
 * ミドルウェアハンドラーの実行オプション
 */
export interface MiddlewareExecutionOptions<
  E extends Record<string, string | undefined> = typeof process.env,
> {
  /** ミドルウェアファクトリー */
  factory: MiddlewareFactory<E>;
  /** ファクトリー実行コンテキスト */
  factoryContext: MiddlewareFactoryContext<E>;
  /** ミドルウェア実行コンテキスト */
  middlewareContext: MiddlewareContext<E>;
  /** 次の処理を実行する関数 */
  next: NextFunction;
}

/**
 * ミドルウェアチェーンの実行オプション
 */
export interface MiddlewareChainOptions<
  E extends Record<string, string | undefined> = typeof process.env,
> {
  /** ミドルウェアファクトリーの配列 */
  factories: MiddlewareFactory<E>[];
  /** ファクトリー実行コンテキスト */
  factoryContext: MiddlewareFactoryContext<E>;
  /** ミドルウェア実行コンテキスト */
  middlewareContext: MiddlewareContext<E>;
  /** 最終的に実行する関数 */
  finalHandler: () => Promise<void> | void;
}

/**
 * ミドルウェア定義（テスト用）
 */
export interface MiddlewareDefinition {
  /** ミドルウェア名 */
  name: string;
  /** ミドルウェアハンドラー */
  handler: MiddlewareHandler;
}

/**
 * ミドルウェアハンドラーインターフェース（テスト用）
 */
export interface MiddlewareHandlerInterface {
  /** ミドルウェアを実行する */
  execute: (context: MiddlewareContext, next: NextFunction) => Promise<void>;
}
