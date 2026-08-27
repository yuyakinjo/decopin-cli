/**
 * 終了コードの規約 (表は test/contract/exit-codes.test.tsx)。
 * `2` を「使い方の誤り」に割り当てるのは POSIX ツールの慣習に合わせたもの。
 */
export const EXIT_CODE = {
  /** 成功 */
  success: 0,
  /** 実行時エラー (command 内の throw) */
  runtime: 1,
  /** 使い方の誤り (未知のコマンド / 引数の検証失敗 / env 不足 など) */
  usage: 2,
  /** Ctrl+C */
  interrupted: 130,
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];
