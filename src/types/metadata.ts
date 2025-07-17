/**
 * コマンドのメタデータ
 */
export interface CommandMetadata {
  /** コマンドの名前 */
  name?: string;
  /** コマンドの説明 */
  description?: string;
  /** 使用例 */
  examples?: string[];
  /** エイリアス */
  aliases?: string[];
}

/**
 * ヘルプメタデータ
 */
export interface CommandHelpMetadata {
  /** コマンド名 */
  name: string;
  /** コマンドの説明 */
  description: string;
  /** 使用例 */
  examples?: string[];
  /** エイリアス */
  aliases?: string[];
  /** 追加のヘルプ情報 */
  additionalHelp?: string;
}

/**
 * コマンドの引数とオプションの定義
 */
export interface CommandSchema {
  /** 位置引数のスキーマ */
  args?: unknown;
  /** オプション引数のスキーマ */
  options?: unknown;
}
