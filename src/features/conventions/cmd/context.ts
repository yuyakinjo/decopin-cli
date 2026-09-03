/** cmd.tsx に渡す、検証と読み込みが完了した実行コンテキスト。 */
export interface CommandContext {
  /** 検証済みの環境変数 */
  env: Record<string, unknown>;
  /** 検証済みの位置引数 */
  args: Record<string, unknown>;
  /** 検証済みのオプション */
  options: Record<string, unknown>;
  /** stdin.tsx があれば読み取った値。無ければ undefined */
  stdin: unknown;
  /** data.tsx の戻り値。無ければ undefined (ADR 25) */
  data: unknown;
  /** コマンド名として消費されなかった生の argv */
  argv: readonly string[];
  cwd: string;
  /** `--dry-run` が付いているか (ADR 37) */
  dryRun: boolean;
}
