import type {
  CLIError,
  ErrorDisplayOptions,
  GlobalErrorContext,
  GlobalErrorExecutionOptions,
  GlobalErrorHandler,
  GlobalErrorHandlerFactory,
  GlobalErrorProcessingResult,
  GlobalErrorTypeGuards,
} from './types.js';

/**
 * グローバルエラーハンドラーを処理する
 *
 * @param options - グローバルエラーハンドラーの実行オプション
 * @returns グローバルエラー処理の結果
 */
export async function processGlobalErrorHandler<E = typeof process.env>(
  options: GlobalErrorExecutionOptions<E>
): Promise<GlobalErrorProcessingResult> {
  const startTime = Date.now();

  try {
    const { factory, context, error } = options;

    // ファクトリー関数を実行してグローバルエラーハンドラーを取得・実行
    const handler =
      typeof factory === 'function' ? await factory(context) : factory;

    await handler(error);

    const processingTime = Date.now() - startTime;

    return {
      handled: true,
      error,
      context,
      processingTime,
    };
  } catch (handlerError) {
    const processingTime = Date.now() - startTime;

    // グローバルエラーハンドラー自体でエラーが発生した場合
    console.error('Global error handler failed:', handlerError);
    console.error('Original error:', options.error);

    return {
      handled: false,
      error: options.error,
      context: options.context,
      processingTime,
      handlerError,
    };
  }
}

/**
 * グローバルエラーハンドラーを実行する
 *
 * @param factory - グローバルエラーハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @param error - 発生したエラー
 * @returns Promise<void>
 */
export async function executeGlobalErrorHandler<E = typeof process.env>(
  factory: GlobalErrorHandlerFactory<E>,
  context: GlobalErrorContext<E>,
  error: unknown
): Promise<void> {
  const handler =
    typeof factory === 'function' ? await factory(context) : factory;

  await handler(error);
}

/**
 * グローバルエラーハンドラーの妥当性を検証する
 *
 * @param factory - 検証するグローバルエラーハンドラーファクトリー
 * @returns 妥当性検証の結果
 */
export function validateGlobalErrorHandler(
  factory: GlobalErrorHandlerFactory
): boolean {
  return typeof factory === 'function';
}

/**
 * デフォルトのグローバルエラーハンドラーを作成する
 *
 * @returns デフォルトのグローバルエラーハンドラー
 */
export function createDefaultGlobalErrorHandler(): GlobalErrorHandlerFactory {
  return async (context: GlobalErrorContext) => {
    return async (error: unknown) => {
      console.error('\n❌ An unexpected error occurred\n');

      if (error instanceof Error) {
        console.error('Error:', error.message);

        // 開発環境ではスタックトレースを表示
        if (context.env.NODE_ENV === 'development' && error.stack) {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      } else {
        console.error('Error:', String(error));
      }

      console.error('\n💡 Tips:');
      console.error('  • Use --help to see available commands');
      console.error('  • Check your command syntax');
      console.error('  • Set NODE_ENV=development for detailed errors');

      process.exit(1);
    };
  };
}

/**
 * エラーの種類を判定するタイプガード
 */
export const globalErrorTypeGuards: GlobalErrorTypeGuards = {
  isValidationError: (error: unknown): boolean => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'issues' in error &&
      Array.isArray((error as any).issues)
    );
  },

  isCLIError: (error: unknown): boolean => {
    return (
      error instanceof Error &&
      'code' in error &&
      typeof (error as any).code === 'string'
    );
  },

  isModuleError: (error: unknown): boolean => {
    return (
      error instanceof Error &&
      (error.message.includes('Cannot find module') ||
        error.message.includes('MODULE_NOT_FOUND') ||
        ('code' in error && (error as any).code === 'MODULE_NOT_FOUND'))
    );
  },

  isSystemError: (error: unknown): boolean => {
    return error instanceof Error && ('errno' in error || 'syscall' in error);
  },

  hasStackTrace: (error: unknown): boolean => {
    return (
      error instanceof Error &&
      typeof error.stack === 'string' &&
      error.stack.length > 0
    );
  },
};

/**
 * エラー情報をフォーマットして表示用の文字列を生成する
 *
 * @param error - フォーマットするエラー
 * @param options - 表示オプション
 * @returns フォーマットされたエラー文字列
 */
export function formatGlobalErrorOutput(
  error: unknown,
  options: ErrorDisplayOptions = {}
): string {
  const {
    verbose = false,
    showStackTrace = false,
    useColors = true,
    json = false,
  } = options;

  if (json) {
    const errorInfo = {
      type: getErrorType(error),
      message: getErrorMessage(error),
      ...(showStackTrace &&
        globalErrorTypeGuards.hasStackTrace(error) && {
          stack: (error as Error).stack,
        }),
    };
    return JSON.stringify(errorInfo, null, 2);
  }

  const lines: string[] = [];
  const errorIcon = useColors ? '❌' : '[ERROR]';

  lines.push(`\n${errorIcon} An unexpected error occurred\n`);

  // エラーの種類に応じた処理
  if (globalErrorTypeGuards.isValidationError(error)) {
    const validationIcon = useColors ? '📋' : '[VALIDATION]';
    lines.push(`${validationIcon} Validation Error:`);

    const validationError = error as any;
    for (const issue of validationError.issues) {
      const path =
        issue.path && issue.path.length > 0
          ? issue.path.map((p: any) => p.key).join('.')
          : 'value';
      lines.push(`  • ${path}: ${issue.message}`);
    }
  } else if (globalErrorTypeGuards.isModuleError(error)) {
    const moduleIcon = useColors ? '📦' : '[MODULE]';
    lines.push(`${moduleIcon} Module Error:`);
    lines.push(`  ${getErrorMessage(error)}`);
  } else if (globalErrorTypeGuards.isCLIError(error)) {
    const cliIcon = useColors ? '⚡' : '[CLI]';
    lines.push(`${cliIcon} CLI Error:`);
    lines.push(`  ${getErrorMessage(error)}`);
  } else if (error instanceof Error) {
    const standardIcon = useColors ? '💥' : '[ERROR]';
    lines.push(`${standardIcon} Error Details:`);
    lines.push(`  ${error.message}`);
  } else {
    const unknownIcon = useColors ? '🔥' : '[UNKNOWN]';
    lines.push(`${unknownIcon} Unknown Error:`);
    lines.push(`  ${String(error)}`);
  }

  // スタックトレース
  if (showStackTrace && globalErrorTypeGuards.hasStackTrace(error)) {
    const stackIcon = useColors ? '📍' : '[STACK]';
    lines.push(`\n${stackIcon} Stack Trace:`);
    lines.push((error as Error).stack || '');
  }

  // ヘルプメッセージ
  if (verbose) {
    const tipIcon = useColors ? '💡' : '[TIP]';
    lines.push(`\n${tipIcon} Tips:`);

    if (globalErrorTypeGuards.isValidationError(error)) {
      lines.push('  • Check your input values against the required format');
      lines.push('  • Use --help to see parameter details');
    } else if (globalErrorTypeGuards.isModuleError(error)) {
      lines.push('  • Ensure all required files are present');
      lines.push('  • Check your project structure');
    } else {
      lines.push('  • Check your command syntax');
      lines.push('  • Use --help to see available options');
    }
    lines.push('  • Set NODE_ENV=development for detailed errors');
  }

  return lines.join('\n');
}

/**
 * エラーの種類を取得する
 */
function getErrorType(error: unknown): string {
  if (globalErrorTypeGuards.isValidationError(error)) return 'validation';
  if (globalErrorTypeGuards.isModuleError(error)) return 'module';
  if (globalErrorTypeGuards.isCLIError(error)) return 'cli';
  if (globalErrorTypeGuards.isSystemError(error)) return 'system';
  if (error instanceof Error) return 'error';
  return 'unknown';
}

/**
 * エラーメッセージを取得する
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * 高度なグローバルエラーハンドラーを作成する
 *
 * @param options - 表示オプション
 * @returns 高度なグローバルエラーハンドラー
 */
export function createAdvancedGlobalErrorHandler(
  options: ErrorDisplayOptions = {}
): GlobalErrorHandlerFactory {
  return async (context: GlobalErrorContext) => {
    const isDevelopment = context.env.NODE_ENV === 'development';
    const isDebug =
      context.env.DEBUG === 'true' || context.env.CLI_DEBUG === 'true';

    return async (error: unknown) => {
      const displayOptions: ErrorDisplayOptions = {
        verbose: true,
        showStackTrace: isDevelopment || isDebug,
        useColors: !context.env.NO_COLOR,
        json: context.env.ERROR_FORMAT === 'json',
        ...options,
      };

      const formattedError = formatGlobalErrorOutput(error, displayOptions);
      console.error(formattedError);

      process.exit(1);
    };
  };
}
