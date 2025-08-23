import type { Context } from '../../types/context.js';

// バージョンハンドラー固有の型定義をここに移動

/**
 * バージョン情報のメタデータ
 */
export interface VersionMetadata {
  /** パッケージ名 */
  name?: string;
  /** バージョン番号 */
  version: string;
  /** 説明 */
  description?: string;
  /** 作成者 */
  author?: string;
  /** その他のメタデータ */
  [key: string]: unknown;
}

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
 * バージョンハンドラー用のコンテキスト
 */
export type VersionContext<E = typeof process.env> = Context<E>;

/**
 * バージョン定義関数の型
 */
export type VersionDefinitionFunction =
  | ((context: VersionContext<typeof process.env>) => VersionHandler)
  | (() => VersionHandler);

/**
 * バージョンハンドラー関連の型定義
 */

/**
 * バージョンハンドラーのファクトリー関数型
 */
export interface VersionHandlerFactory<E = typeof process.env> {
  (context: VersionContext<E>): VersionHandler;
  (): VersionHandler;
}

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
