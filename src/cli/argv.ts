/**
 * decopin 自身の CLI が使う手書きの argv パーサ。
 *
 * ここだけは argv の解析を手で書く。decopin の argv.tsx はビルドされた
 * CLI のためのもので、ビルドする側がそれに依存すると鶏と卵になるため (ADR 5)。
 */

/** `--name value` の value を返す。`--name=value` は受けない */
export function optionValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

/** `--flag` があるか */
export function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

/** サブコマンド名を除いた、`-` で始まらない位置引数 */
export function positionals(argv: string[]): string[] {
  return argv.slice(1).filter((arg) => !arg.startsWith('-'));
}

/** 各 cli/<command>/cmd.ts が export する形。help はここから組み立てる */
export interface Usage {
  /** help の Commands 欄に出す引数の形 (例: `[dir]`) */
  args?: string;
  /** help の Commands 欄に出す 1〜2 行の説明 */
  summary: string;
}
