import type { MiddlewareFactoryContext } from '../../types/context.js';
import type {
  MiddlewareContext,
  MiddlewareFactory,
  MiddlewareHandler,
  NextFunction,
} from '../../types/middleware.js';

/**
 * ミドルウェアハンドラー関連の型定義
 */

/**
 * ミドルウェアハンドラーのファクトリー関数型
 */
export type {
  MiddlewareFactory,
  MiddlewareHandler,
  MiddlewareContext,
  MiddlewareFactoryContext,
  NextFunction,
};

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
export interface MiddlewareExecutionOptions<E = typeof process.env> {
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
export interface MiddlewareChainOptions<E = typeof process.env> {
  /** ミドルウェアファクトリーの配列 */
  factories: MiddlewareFactory<E>[];
  /** ファクトリー実行コンテキスト */
  factoryContext: MiddlewareFactoryContext<E>;
  /** ミドルウェア実行コンテキスト */
  middlewareContext: MiddlewareContext<E>;
  /** 最終的に実行する関数 */
  finalHandler: () => Promise<void> | void;
}
