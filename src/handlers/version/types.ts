import type { VersionContext } from '../../types/context.js';
import type {
  VersionHandler,
  VersionHandlerFactory,
  VersionMetadata,
} from '../../types/validation.js';

/**
 * バージョンハンドラー関連の型定義
 */

/**
 * バージョンハンドラーのファクトリー関数型
 */
export type {
  VersionHandlerFactory,
  VersionHandler,
  VersionContext,
  VersionMetadata,
};

/**
 * バージョン処理の結果
 */
export interface VersionProcessingResult {
  /** 処理されたバージョンハンドラー */
  handler: VersionHandler;
  /** 使用されたコンテキスト */
  context: VersionContext;
  /** 処理が成功したかどうか */
  success: boolean;
  /** エラー情報（失敗時） */
  error?: unknown;
}

/**
 * バージョンハンドラーの実行オプション
 */
export interface VersionExecutionOptions<E = typeof process.env> {
  /** バージョンハンドラーファクトリー */
  factory: VersionHandlerFactory<E>;
  /** 実行コンテキスト */
  context: VersionContext<E>;
}

/**
 * バージョン情報の表示オプション
 */
export interface VersionDisplayOptions {
  /** 詳細情報を表示するかどうか */
  verbose?: boolean;
  /** JSON形式で出力するかどうか */
  json?: boolean;
  /** メタデータを含めるかどうか */
  includeMetadata?: boolean;
}

/**
 * バージョン情報の比較結果
 */
export interface VersionComparisonResult {
  /** 比較結果（-1: より古い, 0: 同じ, 1: より新しい） */
  comparison: -1 | 0 | 1;
  /** 現在のバージョン */
  current: string;
  /** 比較対象のバージョン */
  target: string;
  /** バージョンが有効かどうか */
  valid: boolean;
}
