import type { CLIError } from './errors.js';
import type { EnvSchema, VersionMetadata } from './validation.js';

/**
 * グローバルエラーハンドラー
 */
export type GlobalErrorHandler = (
  error: CLIError | unknown
) => Promise<void> | void;

/**
 * 環境変数ハンドラー
 */
export type EnvHandler = EnvSchema;

/**
 * バージョンハンドラー
 */
export interface VersionHandler {
  /** バージョン番号 */
  version: string;
  /** バージョンメタデータ */
  metadata?: VersionMetadata;
}

/**
 * ヘルプハンドラー
 */
export interface HelpHandler {
  /** コマンド名 */
  name?: string;
  /** 説明 */
  description?: string;
  /** 使用例 */
  examples?: string[];
  /** エイリアス */
  aliases?: string[];
  /** 追加のヘルプテキスト */
  additionalHelp?: string;
}
