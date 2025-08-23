import type {
  MiddlewareChainOptions,
  MiddlewareContext,
  MiddlewareExecutionOptions,
  MiddlewareFactory,
  MiddlewareFactoryContext,
  MiddlewareHandler,
  MiddlewareProcessingResult,
  NextFunction,
} from './types.js';

/**
 * ミドルウェアハンドラーを処理する
 *
 * @param options - ミドルウェアハンドラーの実行オプション
 * @returns ミドルウェア処理の結果
 */
export async function processMiddlewareHandler<
  E extends Record<string, string | undefined> = typeof process.env,
>(options: MiddlewareExecutionOptions<E>): Promise<MiddlewareProcessingResult> {
  const startTime = Date.now();

  try {
    const { factory, factoryContext, middlewareContext, next } = options;

    // ファクトリー関数を実行してミドルウェアハンドラーを取得
    const handler =
      typeof factory === 'function' ? await factory(factoryContext) : factory;

    // ミドルウェアハンドラーを実行
    await handler(middlewareContext, next);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      handler,
      context: factoryContext,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;

    return {
      success: false,
      handler: createDefaultMiddlewareHandler(),
      context: options.factoryContext,
      processingTime,
      error,
    };
  }
}

/**
 * ミドルウェアファクトリーを実行してハンドラーを取得する
 *
 * @param factory - ミドルウェアファクトリー
 * @param context - ファクトリー実行コンテキスト
 * @returns ミドルウェアハンドラー
 */
export async function executeMiddlewareFactory<E = typeof process.env>(
  factory: MiddlewareFactory<E>,
  context: MiddlewareFactoryContext<E>
): Promise<MiddlewareHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * ミドルウェアチェーンを実行する
 *
 * @param options - ミドルウェアチェーンの実行オプション
 * @returns Promise<void>
 */
export async function executeMiddlewareChain<
  E extends Record<string, string | undefined> = typeof process.env,
>(options: MiddlewareChainOptions<E>): Promise<void> {
  const { factories, factoryContext, middlewareContext, finalHandler } =
    options;

  if (factories.length === 0) {
    // ミドルウェアがない場合は最終ハンドラーを直接実行
    await finalHandler();
    return;
  }

  // ミドルウェアハンドラーを作成
  const handlers: MiddlewareHandler[] = [];
  for (const factory of factories) {
    const handler = await executeMiddlewareFactory(factory, factoryContext);
    handlers.push(handler);
  }

  // ミドルウェアチェーンを構築して実行
  let index = 0;

  const next: NextFunction = async () => {
    if (index < handlers.length) {
      const handler = handlers[index++];
      await handler(middlewareContext, next);
    } else {
      // 全てのミドルウェアが実行された後、最終ハンドラーを実行
      await finalHandler();
    }
  };

  // チェーンの実行を開始
  await next();
}

/**
 * ミドルウェアハンドラーの妥当性を検証する
 *
 * @param factory - 検証するミドルウェアファクトリー
 * @returns 妥当性検証の結果
 */
export function validateMiddlewareHandler(factory: MiddlewareFactory): boolean {
  return typeof factory === 'function';
}

/**
 * デフォルトのミドルウェアハンドラーを作成する
 *
 * @returns デフォルトのミドルウェアハンドラー
 */
export function createDefaultMiddlewareHandler(): MiddlewareHandler {
  return async (_context: MiddlewareContext, next: NextFunction) => {
    // デフォルトでは何もせずに次の処理に進む
    await next();
  };
}

/**
 * ログ出力機能付きのミドルウェアハンドラーを作成する
 *
 * @param enableDebug - デバッグログを有効にするかどうか
 * @returns ログ出力機能付きのミドルウェアハンドラー
 */
export function createLoggingMiddlewareHandler(
  enableDebug: boolean = false
): MiddlewareHandler {
  return async (context: MiddlewareContext, next: NextFunction) => {
    if (enableDebug) {
      console.log(
        `[Middleware] Executing command: ${context.command.join(' ')}`
      );
      console.log(`[Middleware] Args: ${JSON.stringify(context.args)}`);
      console.log(`[Middleware] Options: ${JSON.stringify(context.options)}`);
    }

    const startTime = performance.now();

    try {
      await next();

      if (enableDebug) {
        const duration = performance.now() - startTime;
        console.log(
          `[Middleware] Command completed in ${duration.toFixed(2)}ms`
        );
      }
    } catch (error) {
      if (enableDebug) {
        console.error('[Middleware] Command failed:', error);
      }
      throw error;
    }
  };
}

/**
 * パフォーマンス監視機能付きのミドルウェアハンドラーを作成する
 *
 * @returns パフォーマンス監視機能付きのミドルウェアハンドラー
 */
export function createPerformanceMiddlewareHandler(): MiddlewareHandler {
  return async (context: MiddlewareContext, next: NextFunction) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      await next();

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

      if (context.env.CLI_METRICS === 'true') {
        console.log(`[Performance] Command: ${context.command.join(' ')}`);
        console.log(`[Performance] Duration: ${duration.toFixed(2)}ms`);
        console.log(
          `[Performance] Memory usage: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`
        );
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (context.env.CLI_METRICS === 'true') {
        console.log(
          `[Performance] Command failed after ${duration.toFixed(2)}ms`
        );
      }

      throw error;
    }
  };
}
/**
 * ミドルウェアハンドラーを作成する（ファクトリー版）
 *
 * @param factory - ミドルウェアファクトリー
 * @param context - ファクトリーコンテキスト
 * @returns ミドルウェアハンドラー
 */
export async function createMiddlewareHandlerFromFactory<
  E extends Record<string, string | undefined> = typeof process.env,
>(
  factory: MiddlewareFactory<E>,
  context: MiddlewareFactoryContext<E>
): Promise<MiddlewareHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * ミドルウェアハンドラーを作成する（テスト用インターフェース）
 *
 * @param definition - ミドルウェア定義
 * @returns ミドルウェアハンドラーインターフェース
 */
export function createMiddlewareHandler(
  definition: import('./types.js').MiddlewareDefinition
): import('./types.js').MiddlewareHandlerInterface {
  return {
    execute: async (context, next) => {
      await definition.handler(context, next);
    },
  };
}

/**
 * ミドルウェアチェーンを実行する（シンプル版）
 *
 * @param middlewares - ミドルウェアハンドラーの配列またはインターフェースの配列
 * @param context - ミドルウェアコンテキスト
 * @param finalHandler - 最終的に実行する関数
 * @returns 実行結果
 */
export async function executeMiddleware<T = unknown>(
  middlewares: (
    | MiddlewareHandler
    | import('./types.js').MiddlewareHandlerInterface
  )[],
  context: MiddlewareContext,
  finalHandler: () => Promise<T> | T
): Promise<T> {
  let index = 0;

  const _next: NextFunction = async () => {
    if (index < middlewares.length) {
      const middleware = middlewares[index++];
      // Check if it's the interface type or function type
      if (typeof middleware === 'function') {
        await middleware(context, _next);
      } else if (middleware && typeof middleware.execute === 'function') {
        await middleware.execute(context, _next);
      }
    } else {
      // All middlewares executed, call final handler
      await finalHandler();
    }
  };

  let result: T;

  const wrappedNext: NextFunction = async () => {
    if (index < middlewares.length) {
      const middleware = middlewares[index++];
      // Check if it's the interface type or function type
      if (typeof middleware === 'function') {
        await middleware(context, wrappedNext);
      } else if (middleware && typeof middleware.execute === 'function') {
        await middleware.execute(context, wrappedNext);
      }
    } else {
      // All middlewares executed, call final handler
      result = await finalHandler();
    }
  };

  await wrappedNext();
  return result!;
}
