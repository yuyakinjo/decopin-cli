import type { HelpContext } from '../../types/context.js';
import type { HelpHandler, HelpHandlerFactory } from '../../types/handlers.js';

/**
 * ヘルプハンドラー関連の型定義
 */

/**
 * ヘルプハンドラーのファクトリー関数型
 */
export type { HelpHandlerFactory, HelpHandler, HelpContext };

/**
 * ヘルプ情報の処理結果
 */
export interface HelpProcessingResult {
  /** 処理されたヘルプハンドラー */
  handler: HelpHandler;
  /** コンテキスト情報 */
  context: HelpContext;
  /** 処理が成功したかどうか */
  success: boolean;
}

/**
 * ヘルプハンドラーの実行オプション
 */
export interface HelpExecutionOptions {
  /** コマンドパス */
  commandPath: string;
  /** ヘルプハンドラーファクトリー */
  factory: HelpHandlerFactory;
  /** 実行コンテキスト */
  context: HelpContext;
}
