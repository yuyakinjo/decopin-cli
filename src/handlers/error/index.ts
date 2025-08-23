import type {
  ErrorContext,
  ErrorExecutionOptions,
  ErrorHandlerFactory,
  ErrorProcessingResult,
  ErrorTypeGuards,
} from './types.js';

/**
 * エラーハンドラーを実行する
 *
 * @param options - エラーハンドラーの実行オプション
 * @returns エラー処理の結果
 */
export async function processErrorHandler<T = unknown, E = typeof process.env>(
  options: ErrorExecutionOptions<T, E>
): Promise<ErrorProcessingResult> {
  const startTime = Date.now();

  try {
    const { factory, context, error } = options;

    // ファクトリー関数を実行してエラーハンドラーを取得・実行
    if (typeof factory === 'function') {
      await factory(context);
    }

    const processingTime = Date.now() - startTime;

    return {
      handled: true,
      error,
      context,
      processingTime,
    };
  } catch (handlerError) {
    const processingTime = Date.now() - startTime;

    // エラーハンドラー自体でエラーが発生した場合
    console.error('Error handler failed:', handlerError);
    console.error('Original error:', options.error);

    return {
      handled: false,
      error: options.error,
      context: options.context,
      processingTime,
    };
  }
}

/**
 * エラーハンドラーを実行する（シンプル版）
 *
 * @param factory - エラーハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns Promise<void>
 */
export async function executeErrorHandler<T = unknown, E = typeof process.env>(
  factory: ErrorHandlerFactory<T, E>,
  context: ErrorContext<T, E>
): Promise<void> {
  if (typeof factory === 'function') {
    await factory(context);
  }
}

/**
 * エラーハンドラーの妥当性を検証する
 *
 * @param factory - 検証するエラーハンドラーファクトリー
 * @returns 妥当性検証の結果
 */
export function validateErrorHandler(factory: ErrorHandlerFactory): boolean {
  return typeof factory === 'function';
}

/**
 * デフォルトのエラーハンドラーを作成する
 *
 * @param commandPath - コマンドパス
 * @returns デフォルトのエラーハンドラー
 */
export function createDefaultErrorHandler(
  commandPath: string
): ErrorHandlerFactory {
  return async (context: ErrorContext) => {
    const { error } = context;

    console.error(`❌ Error in command '${commandPath}':`);

    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error(`  Stack trace: ${error.stack}`);
      }
    } else {
      console.error(`  ${String(error)}`);
    }

    process.exit(1);
  };
}

/**
 * エラーの種類を判定するタイプガード
 */
export const errorTypeGuards: ErrorTypeGuards = {
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

  isSystemError: (error: unknown): boolean => {
    return error instanceof Error && ('errno' in error || 'syscall' in error);
  },
};

/**
 * エラー情報をフォーマットして表示用の文字列を生成する
 *
 * @param error - フォーマットするエラー
 * @param commandPath - コマンドパス
 * @returns フォーマットされたエラー文字列
 */
export function formatErrorOutput(error: unknown, commandPath: string): string {
  const lines: string[] = [];

  lines.push(`❌ Error in command '${commandPath}':`);
  lines.push('');

  if (errorTypeGuards.isValidationError(error)) {
    const validationError = error as any;
    lines.push('Validation errors:');
    for (const issue of validationError.issues) {
      const field =
        issue.path && issue.path.length > 0
          ? issue.path.map((p: any) => p.key).join('.')
          : 'unknown';
      lines.push(`  • ${field}: ${issue.message}`);
    }
  } else if (error instanceof Error) {
    lines.push(`Message: ${error.message}`);
    if (error.stack) {
      lines.push('Stack trace:');
      lines.push(error.stack);
    }
  } else {
    lines.push(`Unknown error: ${String(error)}`);
  }

  return lines.join('\n');
}
