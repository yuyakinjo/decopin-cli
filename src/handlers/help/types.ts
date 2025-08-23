import type { Context } from '../../types/context.js';

// ヘルプハンドラー固有の型定義をここに移動

/**
 * ヘルプハンドラー
 */
export interface HelpHandler {
  /** コマンド名 */
  name?: string | undefined;
  /** 説明 */
  description?: string | undefined;
  /** 使用例 */
  examples?: string[] | undefined;
  /** エイリアス */
  aliases?: string[] | undefined;
  /** 追加のヘルプテキスト */
  additionalHelp?: string | undefined;
}

/**
 * ヘルプハンドラー用のコンテキスト
 */
export type HelpContext<E = typeof process.env> = Context<E>;

/**
 * ヘルプハンドラー関連の型定義
 */

/**
 * ヘルプハンドラーのファクトリー関数型
 */
export interface HelpHandlerFactory<E = typeof process.env> {
  (context: HelpContext<E>): HelpHandler;
  (): HelpHandler;
}

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

/**
 * ヘルプ定義（テスト用）
 */
export interface HelpDefinition {
  /** 説明 */
  description?: string;
  /** 使用方法 */
  usage?: string;
  /** 使用例 */
  examples?: string[];
  /** オプション */
  options?: Array<{
    name: string;
    description: string;
    type: string;
  }>;
}

/**
 * ヘルプハンドラーインターフェース（テスト用）
 */
export interface HelpHandlerInterface {
  /** ヘルプテキストを生成する */
  generate: () => string;
}
