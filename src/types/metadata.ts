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
  /** 追加のヘルプ情報 */
  additionalHelp?: string;
}

/**
 * ヘルプメタデータ
 */
export interface HelpHandler {
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
