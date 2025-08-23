import type {
  HelpContext,
  HelpExecutionOptions,
  HelpHandler,
  HelpHandlerFactory,
  HelpProcessingResult,
} from './types.js';

/**
 * ヘルプハンドラーの処理を実行する
 *
 * @param options - ヘルプハンドラーの実行オプション
 * @returns ヘルプ情報の処理結果
 */
export async function processHelpHandler(
  options: HelpExecutionOptions
): Promise<HelpProcessingResult> {
  try {
    const { factory, context } = options;

    // ファクトリー関数を実行してヘルプハンドラーを取得
    const handler =
      typeof factory === 'function' ? await factory(context) : factory;

    return {
      handler,
      context,
      success: true,
    };
  } catch (error) {
    // エラーが発生した場合はデフォルトのヘルプハンドラーを返す
    const defaultHandler: HelpHandler = {
      name: options.commandPath,
      description: 'No description available',
      examples: [],
      aliases: [],
      additionalHelp: undefined,
    };

    return {
      handler: defaultHandler,
      context: options.context,
      success: false,
    };
  }
}

/**
 * ヘルプハンドラーを実行してヘルプ情報を取得する
 *
 * @param factory - ヘルプハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns ヘルプハンドラー
 */
export async function executeHelpHandler(
  factory: HelpHandlerFactory,
  context: HelpContext
): Promise<HelpHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * ヘルプハンドラーの妥当性を検証する
 *
 * @param handler - 検証するヘルプハンドラー
 * @returns 妥当性検証の結果
 */
export function validateHelpHandler(handler: HelpHandler): boolean {
  // ヘルプハンドラーは全てのフィールドがオプショナルなので、
  // オブジェクトが存在すれば有効とみなす
  return typeof handler === 'object' && handler !== null;
}

/**
 * デフォルトのヘルプハンドラーを作成する
 *
 * @param commandPath - コマンドパス
 * @returns デフォルトのヘルプハンドラー
 */
export function createDefaultHelpHandler(commandPath: string): HelpHandler {
  return {
    name: commandPath,
    description: 'No description available',
    examples: [],
    aliases: [],
    additionalHelp: undefined,
  };
}

/**
 * ヘルプ情報をフォーマットして表示用の文字列を生成する
 *
 * @param handler - ヘルプハンドラー
 * @param commandPath - コマンドパス
 * @returns フォーマットされたヘルプ文字列
 */
export function formatHelpOutput(
  handler: HelpHandler,
  commandPath: string
): string {
  const lines: string[] = [];

  // コマンド名と説明
  const name = handler.name || commandPath;
  const description = handler.description || 'No description available';
  lines.push(`${name} - ${description}`);
  lines.push('');

  // 使用例
  if (handler.examples && handler.examples.length > 0) {
    lines.push('Examples:');
    handler.examples.forEach((example) => {
      lines.push(`  ${example}`);
    });
    lines.push('');
  }

  // エイリアス
  if (handler.aliases && handler.aliases.length > 0) {
    lines.push(`Aliases: ${handler.aliases.join(', ')}`);
    lines.push('');
  }

  // 追加のヘルプテキスト
  if (handler.additionalHelp) {
    lines.push(handler.additionalHelp);
    lines.push('');
  }

  return lines.join('\n').trim();
}
